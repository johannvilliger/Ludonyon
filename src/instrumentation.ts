export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const globalForReminders = globalThis as unknown as {
    remindersIntervalStarted?: boolean;
  };
  if (globalForReminders.remindersIntervalStarted) return;
  globalForReminders.remindersIntervalStarted = true;

  const { checkAndSendEventReminders, checkAndSendReplacementProblemAlerts } = await import(
    "@/lib/reminders"
  );
  const CHECK_INTERVAL_MS = 5 * 60 * 1000;

  setInterval(() => {
    checkAndSendEventReminders().catch((err) => {
      console.error("Erreur lors de l'envoi des rappels d'événements :", err);
    });
    checkAndSendReplacementProblemAlerts().catch((err) => {
      console.error("Erreur lors de l'envoi des alertes créneaux à risque :", err);
    });
  }, CHECK_INTERVAL_MS);
}
