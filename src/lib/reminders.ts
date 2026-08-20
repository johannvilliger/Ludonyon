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

  for (const signup of dueSignups) {
    await sendPushToUser(signup.userId, {
      title: "Rappel : " + signup.event.title,
      body: formatEventDate(signup.event.startsAt, signup.event.endsAt),
      url: "/evenements",
    });
    await prisma.eventSignup.update({
      where: { id: signup.id },
      data: { reminderSentAt: now },
    });
  }
}
