function escapeVCard(value: string): string {
  return value.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
}

export function buildVCard(user: {
  name: string;
  email: string;
  phone: string | null;
}): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVCard(user.name)}`,
    `N:${escapeVCard(user.name)};;;;`,
    `EMAIL;TYPE=INTERNET:${escapeVCard(user.email)}`,
  ];
  if (user.phone) {
    lines.push(`TEL;TYPE=CELL:${escapeVCard(user.phone)}`);
  }
  lines.push("END:VCARD");
  return lines.join("\r\n");
}
