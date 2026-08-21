import { prisma } from "@/lib/prisma";
import { sendPushToUser, pushConfigured } from "@/lib/push";
import { formatEventDate } from "@/lib/format";

const REMINDER_WINDOW_MINUTES = 60;

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
