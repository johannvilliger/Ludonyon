import { prisma } from "@/lib/prisma";
import { sendPushToUser, sendPushToUsers, pushConfigured } from "@/lib/push";
import { formatEventDate } from "@/lib/format";
import {
  SITE_LABELS,
  findSlotDef,
  formatDayLabel,
  formatHoursRange,
  type Periode,
  type Site,
} from "@/lib/planning";

const REMINDER_WINDOW_MINUTES = 60;
// Fenêtre "semaine suivante" : créneaux dans les 7 prochains jours.
const REPLACEMENT_ALERT_WINDOW_DAYS = 7;

export async function checkAndSendEventReminders() {
  if (!pushConfigured()) return;

  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MINUTES * 60000);

  const dueSignups = await prisma.eventSignup.findMany({
    where: {
      wantsReminder: true,
      reminderSentAt: null,
      event: { startsAt: { gte: now, lte: windowEnd } },
    },
    include: { event: true },
  });

  const byEvent = new Map<string, typeof dueSignups>();
  for (const signup of dueSignups) {
    const list = byEvent.get(signup.eventId) ?? [];
    list.push(signup);
    byEvent.set(signup.eventId, list);
  }

  for (const [, signups] of byEvent) {
    const event = signups[0].event;
    const title = "Rappel : " + event.title;
    const body = formatEventDate(event.startsAt, event.endsAt);

    for (const signup of signups) {
      await sendPushToUser(signup.userId, { title, body, url: "/evenements" });
      await prisma.eventSignup.update({
        where: { id: signup.id },
        data: { reminderSentAt: now },
      });
    }

    await prisma.pushNotificationLog.create({
      data: {
        category: "EVENT_REMINDER",
        title,
        body,
        recipients: signups.length,
      },
    });
  }
}

// Alerte les responsables/comité quand un créneau des 7 prochains jours est
// toujours "en attente de remplaçant·e" (recherche non annulée), pour
// éviter de découvrir le problème le jour même. Une seule alerte par
// recherche en cours (voir problemAlertSentAt, remis à null si la
// recherche est annulée puis relancée).
export async function checkAndSendReplacementProblemAlerts() {
  if (!pushConfigured()) return;

  const now = new Date();
  const start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const end = new Date(start.getTime() + REPLACEMENT_ALERT_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const atRisk = await prisma.openingShiftAssignee.findMany({
    where: {
      seekingReplacement: true,
      problemAlertSentAt: null,
      shift: { date: { gte: start, lte: end } },
    },
    include: { shift: true, user: { select: { name: true } } },
  });

  for (const assignee of atRisk) {
    const site = assignee.shift.site as Site;
    const periode = assignee.shift.periode as Periode;
    const slot = findSlotDef(site, periode);

    const managers = await prisma.user.findMany({
      where: {
        active: true,
        role: { in: ["RESPONSABLE", "COMITE"] },
        id: { not: assignee.userId },
      },
      select: { id: true },
    });

    if (managers.length === 0) {
      await prisma.openingShiftAssignee.update({
        where: { id: assignee.id },
        data: { problemAlertSentAt: now },
      });
      continue;
    }

    const title = "Créneau à risque";
    const hours = slot ? ` (${formatHoursRange(slot.start, slot.end)})` : "";
    const body = `Aucun·e remplaçant·e trouvé·e pour le ${formatDayLabel(
      assignee.shift.date
    )} à ${SITE_LABELS[site]}${hours} — ${assignee.user.name} ne peut pas assurer ce créneau.`;

    await sendPushToUsers(
      managers.map((m) => m.id),
      { title, body, url: "/organisation/planning" }
    );
    await prisma.pushNotificationLog.create({
      data: {
        category: "REPLACEMENT_PROBLEM",
        title,
        body,
        recipients: managers.length,
      },
    });
    await prisma.openingShiftAssignee.update({
      where: { id: assignee.id },
      data: { problemAlertSentAt: now },
    });
  }
}
