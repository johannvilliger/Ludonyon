import Link from "next/link";
import { requireOrganisationUser } from "@/lib/session";
import { computeAutoScheduleForMonth } from "@/lib/autoSchedule";
import { applyAutoSchedule } from "@/lib/actions/autoSchedule";
import {
  SITE_LABELS,
  formatDayLabel,
  formatMonthLabel,
  findSlotDef,
  formatHoursRange,
} from "@/lib/planning";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { POSTE_LABELS, type Poste } from "@/lib/postes";
import PlanningMonthNav from "@/components/PlanningMonthNav";

export default async function AutoPlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  await requireOrganisationUser();

  const { y, m } = await searchParams;
  const now = new Date();
  const year = Number(y) || now.getFullYear();
  const month = Number(m) || now.getMonth() + 1;

  const { shifts, assignmentCountByUser } = await computeAutoScheduleForMonth(year, month);

  const byUser = shifts
    .flatMap((s) => s.assignees.map((a) => a.name))
    .reduce<Map<string, number>>((map, name) => {
      map.set(name, (map.get(name) ?? 0) + 1);
      return map;
    }, new Map());
  const recap = [...byUser.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const unassignedButCounted = [...assignmentCountByUser.entries()].filter(([, n]) => n === 0);

  const missingResponsableCount = shifts.filter((s) => s.missingResponsable).length;
  const understaffedCount = shifts.filter((s) => s.understaffed).length;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/organisation/planning"
          className="text-sm text-stone-500 hover:underline"
        >
          ← Planning des ouvertures
        </Link>
      </div>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-stone-900">
            🧪 Répartition automatique (test)
          </h2>
          <PlanningMonthNav basePath="/organisation/planning/auto" year={year} month={month} />
        </div>
        <p className="mt-1 text-sm text-stone-500">
          Proposition calculée à partir des disponibilités cochées, des
          vacances déclarées et des fermetures, en essayant de répartir les
          créneaux équitablement (personne n&rsquo;est proposé·e deux fois
          tant que d&rsquo;autres personnes disponibles n&rsquo;ont encore
          rien). Chaque créneau inclut au moins un·e responsable ou membre
          du comité. Purement consultatif tant que vous ne cliquez pas sur
          « Appliquer » ci-dessous — le planning normal n&rsquo;est pas
          modifié entre-temps.
        </p>

        {(missingResponsableCount > 0 || understaffedCount > 0) && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {understaffedCount > 0 &&
              `${understaffedCount} créneau${understaffedCount > 1 ? "x" : ""} incomplet${understaffedCount > 1 ? "s" : ""} (pas assez de monde disponible). `}
            {missingResponsableCount > 0 &&
              `${missingResponsableCount} créneau${missingResponsableCount > 1 ? "x" : ""} sans responsable/comité disponible.`}
          </p>
        )}
      </section>

      <section>
        <ul className="space-y-3">
          {shifts.map((shift) => {
            const slot = findSlotDef(shift.site, shift.periode);
            const alert = shift.missingResponsable || shift.understaffed;
            return (
              <li
                key={`${shift.dateKeyStr}-${shift.site}-${shift.periode}`}
                className={`rounded-xl border p-4 ${
                  alert ? "border-red-200 bg-red-50" : "border-stone-200 bg-white"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-stone-900">
                    {formatDayLabel(shift.date)} · {shift.groupLabel} · {SITE_LABELS[shift.site]}
                  </p>
                  <span className="text-xs text-stone-500">
                    {slot ? formatHoursRange(slot.start, slot.end) : ""} ·{" "}
                    {shift.assignees.length}/{shift.required}
                  </span>
                </div>
                {shift.assignees.length === 0 ? (
                  <p className="mt-1 text-sm text-red-700">Personne de disponible.</p>
                ) : (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {shift.assignees.map((a) => (
                      <li
                        key={a.userId}
                        className={`rounded-full px-2.5 py-1 text-xs ${
                          a.isResponsableSeat
                            ? "bg-stone-900 text-white"
                            : "bg-brand-blue-soft text-brand-blue-dark"
                        }`}
                      >
                        {a.name}
                        {a.isResponsableSeat
                          ? ` · ${ROLE_LABELS[a.role as Role] ?? a.role}`
                          : a.poste
                            ? ` · ${POSTE_LABELS[a.poste as Poste] ?? a.poste}`
                            : ""}
                      </li>
                    ))}
                  </ul>
                )}
                {shift.missingResponsable && (
                  <p className="mt-1 text-xs text-red-600">
                    Aucun·e responsable/comité disponible pour ce créneau.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-medium text-stone-900">
          Répartition par personne
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          Nombre de créneaux proposés ce mois-ci, pour vérifier
          l&rsquo;équité en un coup d&rsquo;œil.
        </p>
        {recap.length === 0 ? (
          <p className="mt-2 text-sm text-stone-400">Aucune proposition pour l&rsquo;instant.</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {recap.map(([name, count]) => (
              <li
                key={name}
                className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600"
              >
                {name} · {count}
              </li>
            ))}
          </ul>
        )}
        {unassignedButCounted.length > 0 && (
          <p className="mt-2 text-xs text-stone-400">
            {unassignedButCounted.length} bénévole
            {unassignedButCounted.length > 1 ? "s" : ""} actif
            {unassignedButCounted.length > 1 ? "s" : ""} sans aucune proposition ce
            mois-ci (indisponible, en vacances, ou pas de créneau coché).
          </p>
        )}
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-4">
        <details>
          <summary className="cursor-pointer text-sm font-medium text-red-600">
            Appliquer cette proposition au planning réel
          </summary>
          <p className="mt-2 text-sm text-stone-600">
            Remplace <strong>toutes</strong> les assignations déjà
            enregistrées pour {formatMonthLabel(year, month)} par cette
            proposition — irréversible, sauf à réassigner manuellement
            ensuite.
          </p>
          <form action={applyAutoSchedule} className="mt-3">
            <input type="hidden" name="year" value={year} />
            <input type="hidden" name="month" value={month} />
            <button
              type="submit"
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Confirmer et remplacer le planning de ce mois
            </button>
          </form>
        </details>
      </section>
    </div>
  );
}
