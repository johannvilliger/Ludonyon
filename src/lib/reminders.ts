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

// Alerte les responsables/comité quand un ou plusieurs créneaux des 7
// prochains jours sont toujours "en attente de remplaçant·e" (recherche
// non annulée). Une seule notification groupée, envoyée une fois par jour
// (voir la planification dans instrumentation.ts) plutôt qu'à chaque
// vérification. problemAlertSentAt évite de réinclure un créneau déjà
// signalé ; il est remis à null si la recherche est annulée puis relancée.
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
    orderBy: { shift: { date: "asc" } },
  });

  if (atRisk.length === 0) return;

  const managers = await prisma.user.findMany({
    where: { active: true, role: { in: ["RESPONSABLE", "COMITE"] } },
    select: { id: true },
  });

  if (managers.length > 0) {
    const lines = atRisk.map((assignee) => {
      const site = assignee.shift.site as Site;
      const periode = assignee.shift.periode as Periode;
      const slot = findSlotDef(site, periode);
      const hours = slot ? ` (${formatHoursRange(slot.start, slot.end)})` : "";
      return `${formatDayLabel(assignee.shift.date)} à ${SITE_LABELS[site]}${hours} — ${assignee.user.name}`;
    });

    const title = atRisk.length > 1 ? "Créneaux à risque" : "Créneau à risque";
    const body =
      (atRisk.length > 1
        ? `${atRisk.length} créneaux sans remplaçant·e cette semaine :\n`
        : "Aucun·e remplaçant·e trouvé·e :\n") + lines.join("\n");

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
  }

  await prisma.openingShiftAssignee.updateMany({
    where: { id: { in: atRisk.map((a) => a.id) } },
    data: { problemAlertSentAt: now },
  });
}
