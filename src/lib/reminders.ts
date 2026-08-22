import { prisma } from "@/lib/prisma";
import { sendPushToUser, sendPushToUsers, pushConfigured } from "@/lib/push";
import { formatEventDate } from "@/lib/format";
import {
  SITE_LABELS,
  findSlotDef,
  formatDayLabel,
  formatHourLabel,
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
    include: { event: true, user: { select: { name: true } } },
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
        recipientNames: signups.map((s) => s.user.name).join(", "),
      },
    });
  }
}

// Alerte les responsables/comité quand un ou plusieurs créneaux des 7
// prochains jours (la semaine suivante) sont toujours "en attente de
// remplaçant·e" (recherche non annulée). Une seule notification groupée,
// envoyée une fois par semaine, le dimanche à 19h (voir la planification
// dans instrumentation.ts), plutôt qu'à chaque vérification.
// problemAlertSentAt évite de réinclure un créneau déjà signalé ; il est
// remis à null si la recherche est annulée puis relancée.
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
    select: { id: true, name: true },
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
        recipientNames: managers.map((m) => m.name).join(", "),
      },
    });
  }

  await prisma.openingShiftAssignee.updateMany({
    where: { id: { in: atRisk.map((a) => a.id) } },
    data: { problemAlertSentAt: now },
  });
}

// Rappel individuel la veille au soir (19h, voir instrumentation.ts) pour
// chaque bénévole ayant activé "Rappels pour les ouvertures" (profil) et
// assigné à un créneau le lendemain.
export async function checkAndSendOpeningShiftReminders() {
  if (!pushConfigured()) return;

  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomorrowUTC = new Date(Date.UTC(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate()));

  const shifts = await prisma.openingShift.findMany({
    where: { date: tomorrowUTC },
    include: {
      assignees: {
        where: { reminderSentAt: null, user: { wantsOpeningReminders: true } },
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });

  for (const shift of shifts) {
    if (shift.assignees.length === 0) continue;

    const site = shift.site as Site;
    const periode = shift.periode as Periode;
    const slot = findSlotDef(site, periode);
    if (!slot) continue;

    const title = "Rappel ouverture";
    const body = `Demain ${formatDayLabel(shift.date)}, tu es inscrit·e à l’ouverture à ${SITE_LABELS[site]} dès ${formatHourLabel(slot.start)}`;

    await sendPushToUsers(
      shift.assignees.map((a) => a.userId),
      { title, body, url: "/planning" }
    );
    await prisma.openingShiftAssignee.updateMany({
      where: { id: { in: shift.assignees.map((a) => a.id) } },
      data: { reminderSentAt: now },
    });
    await prisma.pushNotificationLog.create({
      data: {
        category: "OPENING_REMINDER",
        title,
        body,
        recipients: shift.assignees.length,
        recipientNames: shift.assignees.map((a) => a.user.name).join(", "),
      },
    });
  }
}
