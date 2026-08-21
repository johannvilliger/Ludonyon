import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isOrganisationRole } from "@/lib/roles";
import {
  PLANNING_COLUMNS,
  addMonths,
  dateKey,
  formatDayLabel,
  formatMonthLabel,
  getPlanningWeeks,
  shiftKey,
} from "@/lib/planning";
import { assignToShift, removeFromShift } from "@/lib/actions/planning";
import PlanningAssignSelect from "@/components/PlanningAssignSelect";

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const user = await requireUser();
  const isOrg = isOrganisationRole(user.role);

  const { y, m } = await searchParams;
  const now = new Date();
  const year = Number(y) || now.getFullYear();
  const month = Number(m) || now.getMonth() + 1;

  const weeks = getPlanningWeeks(year, month);
  const rangeStart = weeks[0].monday;
  const rangeEnd = new Date(weeks[weeks.length - 1].monday);
  rangeEnd.setDate(rangeEnd.getDate() + 7);

  const [shifts, activeUsers] = await Promise.all([
    prisma.openingShift.findMany({
      where: { date: { gte: rangeStart, lt: rangeEnd } },
      include: {
        assignees: {
          include: { user: { select: { id: true, name: true, active: true } } },
        },
      },
    }),
    isOrg
      ? prisma.user.findMany({
          where: { active: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const shiftsByKey = new Map<
    string,
    { id: string; assignees: { userId: string; name: string }[] }
  >();
  for (const shift of shifts) {
    shiftsByKey.set(shiftKey(shift.date, shift.site as never, shift.periode as never), {
      id: shift.id,
      assignees: shift.assignees
        .filter((a) => a.user.active)
        .map((a) => ({ userId: a.user.id, name: a.user.name })),
    });
  }

  const prev = addMonths(year, month, -1);
  const next = addMonths(year, month, 1);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-stone-900">
          Planning des ouvertures
        </h1>
        <div className="flex items-center gap-2 text-sm">
          <Link
            href={`/planning?y=${prev.year}&m=${prev.month}`}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-stone-600 hover:bg-stone-100"
          >
            ← Précédent
          </Link>
          <span className="min-w-36 text-center font-medium text-stone-800">
            {formatMonthLabel(year, month)}
          </span>
          <Link
            href={`/planning?y=${next.year}&m=${next.month}`}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-stone-600 hover:bg-stone-100"
          >
            Suivant →
          </Link>
        </div>
      </div>
      <p className="mt-1 text-sm text-stone-500">
        Qui tient la ludothèque, jour par jour.
        {!isOrg && " Géré par les responsables/comité."}
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full min-w-[800px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50">
              {PLANNING_COLUMNS.map((column) =>
                column.slots.length === 1 ? (
                  <th
                    key={column.key}
                    rowSpan={2}
                    className="border-r border-stone-200 px-3 py-2 text-left font-medium text-stone-700 last:border-r-0"
                  >
                    {column.label}
                    <div className="text-xs font-normal text-stone-400">
                      {column.slots[0].hours}
                    </div>
                  </th>
                ) : (
                  <th
                    key={column.key}
                    colSpan={column.slots.length}
                    className="border-r border-b border-stone-200 px-3 py-1 text-center font-medium text-stone-700 last:border-r-0"
                  >
                    {column.label}
                  </th>
                )
              )}
            </tr>
            <tr className="border-b border-stone-200 bg-stone-50">
              {PLANNING_COLUMNS.flatMap((column) =>
                column.slots.length === 1
                  ? []
                  : column.slots.map((slot, i) => (
                      <th
                        key={`${column.key}-${slot.site}`}
                        className={`px-3 py-1 text-left text-xs font-normal text-stone-500 ${
                          i < column.slots.length - 1
                            ? "border-r border-stone-200"
                            : "last:border-r-0"
                        }`}
                      >
                        {slot.site === "NYON" ? "Nyon" : "Gland"} · {slot.hours}
                      </th>
                    ))
              )}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week.monday.toISOString()} className="border-b border-stone-100 last:border-b-0">
                {week.cells.map((cell, i) => {
                  const key = shiftKey(cell.date, cell.leaf.site, cell.leaf.periode);
                  const shift = shiftsByKey.get(key);
                  const assignees = shift?.assignees ?? [];
                  const availableUsers = activeUsers.filter(
                    (u) => !assignees.some((a) => a.userId === u.id)
                  );
                  return (
                    <td
                      key={i}
                      className={`align-top border-r border-stone-100 p-2 last:border-r-0 ${
                        cell.inMonth ? "" : "bg-stone-50/60"
                      }`}
                    >
                      <div
                        className={`text-xs font-medium ${
                          cell.inMonth ? "text-stone-700" : "text-stone-400"
                        }`}
                      >
                        {formatDayLabel(cell.date)}
                      </div>
                      <ul className="mt-1 space-y-1">
                        {assignees.length === 0 && (
                          <li className="text-xs text-stone-300">—</li>
                        )}
                        {assignees.map((a) => (
                          <li
                            key={a.userId}
                            className="flex items-center justify-between gap-1 rounded bg-brand-yellow-soft px-1.5 py-0.5 text-xs text-stone-800"
                          >
                            <span>{a.name}</span>
                            {isOrg && shift && (
                              <form action={removeFromShift}>
                                <input type="hidden" name="shiftId" value={shift.id} />
                                <input type="hidden" name="userId" value={a.userId} />
                                <button
                                  type="submit"
                                  className="text-stone-400 hover:text-red-600"
                                  aria-label={`Retirer ${a.name}`}
                                >
                                  ×
                                </button>
                              </form>
                            )}
                          </li>
                        ))}
                      </ul>
                      {isOrg && availableUsers.length > 0 && (
                        <PlanningAssignSelect
                          action={assignToShift}
                          date={dateKey(cell.date)}
                          site={cell.leaf.site}
                          periode={cell.leaf.periode}
                          options={availableUsers}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
