import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { buildIcsCalendar, buildIcsEvent } from "@/lib/ics";
import { SITE_LABELS, getShiftDateTimeRange, type Periode, type Site } from "@/lib/planning";

export async function GET(request: Request) {
  const user = await requireUser();
  const { searchParams } = new URL(request.url);

  const now = new Date();
  const year = Number(searchParams.get("y")) || now.getFullYear();
  const month = Number(searchParams.get("m")) || now.getMonth() + 1;

  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 1));

  const shifts = await prisma.openingShift.findMany({
    where: {
      date: { gte: monthStart, lt: monthEnd },
      assignees: { some: { userId: user.id } },
    },
    orderBy: { date: "asc" },
  });

  const events = shifts.flatMap((shift) => {
    const site = shift.site as Site;
    const periode = shift.periode as Periode;
    const range = getShiftDateTimeRange(shift.date, site, periode);
    if (!range) return [];
    return [
      buildIcsEvent({
        uid: `ouverture-${shift.id}@ludonyon`,
        summary: `Ouverture — ${SITE_LABELS[site]}`,
        location: SITE_LABELS[site],
        start: range.start,
        end: range.end,
      }),
    ];
  });

  const ics = buildIcsCalendar(events);

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="mes-ouvertures-${year}-${String(month).padStart(2, "0")}.ics"`,
    },
  });
}
