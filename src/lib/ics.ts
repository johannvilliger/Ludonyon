function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    parts.push(rest.slice(0, 75));
    rest = " " + rest.slice(75);
  }
  parts.push(rest);
  return parts.join("\r\n");
}

function formatIcsDateTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function formatIcsDate(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

export type IcsEventInput = {
  uid: string;
  summary: string;
  description?: string | null;
  location?: string | null;
} & (
  | { allDay: true; date: Date }
  | { allDay?: false; start: Date; end?: Date | null }
);

export function buildIcsEvent(input: IcsEventInput): string {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${input.uid}`,
    `DTSTAMP:${formatIcsDateTime(new Date())}`,
    `SUMMARY:${escapeIcsText(input.summary)}`,
  ];

  if (input.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(input.date)}`);
    lines.push(`DTEND;VALUE=DATE:${formatIcsDate(addDays(input.date, 1))}`);
  } else {
    lines.push(`DTSTART:${formatIcsDateTime(input.start)}`);
    const end = input.end ?? new Date(input.start.getTime() + 60 * 60000);
    lines.push(`DTEND:${formatIcsDateTime(end)}`);
  }

  if (input.location) {
    lines.push(`LOCATION:${escapeIcsText(input.location)}`);
  }
  if (input.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(input.description)}`);
  }

  lines.push("END:VEVENT");
  return lines.map(foldLine).join("\r\n");
}

export function buildIcsCalendar(events: string[]): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ludonyon//FR",
    "CALSCALE:GREGORIAN",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}
