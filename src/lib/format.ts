const dateFormatter = new Intl.DateTimeFormat("fr-CH", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const timeFormatter = new Intl.DateTimeFormat("fr-CH", {
  hour: "2-digit",
  minute: "2-digit",
});

const dateTimeFormatter = new Intl.DateTimeFormat("fr-CH", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatEventDate(start: Date, end?: Date | null): string {
  const day = dateFormatter.format(start);
  const from = timeFormatter.format(start);
  if (!end) return `${day}, dès ${from}`;
  return `${day}, ${from} – ${timeFormatter.format(end)}`;
}

export function formatDateTime(date: Date): string {
  return dateTimeFormatter.format(date);
}
