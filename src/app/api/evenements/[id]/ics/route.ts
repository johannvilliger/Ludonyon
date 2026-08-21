import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canAccessEventAudience } from "@/lib/roles";
import { buildIcsCalendar, buildIcsEvent } from "@/lib/ics";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event || !canAccessEventAudience(event.audience, user.role)) {
    return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
  }

  const ics = buildIcsCalendar([
    buildIcsEvent({
      uid: `event-${event.id}@ludonyon`,
      summary: event.title,
      description: event.description,
      location: event.location,
      start: event.startsAt,
      end: event.endsAt,
    }),
  ]);

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="evenement.ics"`,
    },
  });
}
