const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const REPLACEMENT_ALERT_HOUR = 19;

// Millisecondes jusqu'au prochain dimanche REPLACEMENT_ALERT_HOUR:00 heure
// serveur (TZ=Europe/Zurich en production) — une seule alerte groupée par
// semaine, pour la semaine suivante.
function msUntilNextSundayAlertHour(): number {
  const now = new Date();
  const daysUntilSunday = (7 - now.getDay()) % 7; // getDay() : dimanche = 0
  const next = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + daysUntilSunday,
    REPLACEMENT_ALERT_HOUR,
    0,
    0,
    0
  );
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 7);
  }
  return next.getTime() - now.getTime();
}

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

  // Rappels d'événements : vérification fréquente, la fenêtre de rappel
  // (1h avant l'événement) est courte.
  const EVENT_REMINDER_INTERVAL_MS = 5 * 60 * 1000;
  setInterval(() => {
    checkAndSendEventReminders().catch((err) => {
      console.error("Erreur lors de l'envoi des rappels d'événements :", err);
    });
  }, EVENT_REMINDER_INTERVAL_MS);

  // Alerte créneaux à risque : une seule vérification groupée par semaine,
  // le dimanche à 19h, pour la semaine suivante — pas de notification à
  // chaque créneau signalé.
  setTimeout(() => {
    checkAndSendReplacementProblemAlerts().catch((err) => {
      console.error("Erreur lors de l'envoi des alertes créneaux à risque :", err);
    });
    setInterval(() => {
      checkAndSendReplacementProblemAlerts().catch((err) => {
        console.error("Erreur lors de l'envoi des alertes créneaux à risque :", err);
      });
    }, WEEK_MS);
  }, msUntilNextSundayAlertHour());
}
