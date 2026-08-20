// Fuseau horaire suisse — explicite ici en plus de la variable
// d'environnement TZ, pour un affichage correct même si le serveur ne la
// respecte pas (voir .env.example).
const TIMEZONE = "Europe/Zurich";

const dateFormatter = new Intl.DateTimeFormat("fr-CH", {
  timeZone: TIMEZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});

const timeFormatter = new Intl.DateTimeFormat("fr-CH", {
  timeZone: TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
});

const dateTimeFormatter = new Intl.DateTimeFormat("fr-CH", {
  timeZone: TIMEZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const dateOnlyFormatter = new Intl.DateTimeFormat("fr-CH", {
  timeZone: TIMEZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatDateOnly(date: Date): string {
  return dateOnlyFormatter.format(date);
}

export function formatEventDate(start: Date, end?: Date | null): string {
  const day = dateFormatter.format(start);
  const from = timeFormatter.format(start);
  if (!end) return `${day}, dès ${from}`;
  return `${day}, ${from} – ${timeFormatter.format(end)}`;
}

export function formatDateTime(date: Date): string {
  return dateTimeFormatter.format(date);
}

export function formatTime(date: Date): string {
  return timeFormatter.format(date);
}

export function formatDuration(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h${String(rest).padStart(2, "0")}`;
}
