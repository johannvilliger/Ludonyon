import { prisma } from "@/lib/prisma";
import { getPlanningWeeks, shiftKey, type PlanningWeek } from "@/lib/planning";

export type ShiftAssignee = { userId: string; name: string };
export type ShiftInfo = { id: string; assignees: ShiftAssignee[] };
export type ShiftMap = Map<string, ShiftInfo>;

// Charge les semaines du mois demandé et les créneaux déjà assignés,
// indexés par shiftKey(date, site, periode) — partagé entre la page
// publique (lecture seule) et la page de gestion (assignation).
export async function loadPlanningWeeksAndShifts(
  year: number,
  month: number
): Promise<{ weeks: PlanningWeek[]; shiftsByKey: ShiftMap }> {
  const weeks = getPlanningWeeks(year, month);
  const rangeStart = weeks[0].monday;
  const rangeEnd = new Date(weeks[weeks.length - 1].monday);
  rangeEnd.setDate(rangeEnd.getDate() + 7);

  const shifts = await prisma.openingShift.findMany({
    where: { date: { gte: rangeStart, lt: rangeEnd } },
    include: {
      assignees: {
        include: { user: { select: { id: true, name: true, active: true } } },
      },
    },
  });

  const shiftsByKey: ShiftMap = new Map();
  for (const shift of shifts) {
    shiftsByKey.set(shiftKey(shift.date, shift.site as never, shift.periode as never), {
      id: shift.id,
      assignees: shift.assignees
        .filter((a) => a.user.active)
        .map((a) => ({ userId: a.user.id, name: a.user.name })),
    });
  }

  return { weeks, shiftsByKey };
}
