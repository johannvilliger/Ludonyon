import { dateKey, formatDayLabel, getLeafSlots, shiftKey, type PlanningWeek } from "@/lib/planning";
import type { ShiftMap } from "@/lib/planningData";
import { assignToShift, removeFromShift } from "@/lib/actions/planning";
import PlanningAssignSelect from "./PlanningAssignSelect";

export default function PlanningTable({
  weeks,
  shiftsByKey,
  editable,
  activeUsers,
}: {
  weeks: PlanningWeek[];
  shiftsByKey: ShiftMap;
  editable: boolean;
  activeUsers: { id: string; name: string }[];
}) {
  const leaves = getLeafSlots();
  const nyonCount = leaves.filter((l) => l.site === "NYON").length;
  // Bordure pour marquer visuellement la frontière entre le bloc Nyon (à
  // gauche, ~3/4 de la largeur) et le bloc Gland (à droite).
  const siteDivider = (i: number) => (i === nyonCount ? "border-l-2 border-l-stone-300" : "");

  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
      <table className="w-full min-w-[800px] table-fixed border-collapse text-sm">
        <colgroup>
          {leaves.map((leaf, i) => (
            <col
              key={i}
              style={{
                width: `${
                  leaf.site === "NYON" ? 75 / nyonCount : 25 / (leaves.length - nyonCount)
                }%`,
              }}
            />
          ))}
        </colgroup>
        <thead>
          <tr className="border-b border-stone-200">
            <th
              colSpan={nyonCount}
              className="bg-brand-blue-soft/50 px-3 py-1.5 text-center font-medium text-stone-700"
            >
              Nyon
            </th>
            <th
              colSpan={leaves.length - nyonCount}
              className="border-l-2 border-l-stone-300 bg-brand-yellow-soft/50 px-3 py-1.5 text-center font-medium text-stone-700"
            >
              Gland
            </th>
          </tr>
          <tr className="border-b border-stone-200 bg-stone-50">
            {leaves.map((leaf, i) => (
              <th
                key={i}
                className={`border-r border-stone-200 px-3 py-2 text-left font-medium text-stone-700 last:border-r-0 ${siteDivider(
                  i
                )}`}
              >
                {leaf.groupLabel}
                <div className="text-xs font-normal text-stone-400">{leaf.hours}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, wi) => (
            <tr
              key={week.monday.toISOString()}
              className={`border-b border-stone-100 last:border-b-0 ${
                wi % 2 === 1 ? "bg-stone-100" : ""
              }`}
            >
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
                    className={`align-top border-r border-stone-100 p-2 last:border-r-0 ${siteDivider(
                      i
                    )} ${cell.inMonth ? "" : "bg-stone-50/60"}`}
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
                          {editable && shift && (
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
                    {editable && availableUsers.length > 0 && (
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
  );
}
