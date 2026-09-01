import Link from "next/link";
import { requireOrganisationUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { computeAutoScheduleForMonth } from "@/lib/autoSchedule";
import {
  applyAutoSchedule,
  addAutoScheduleOverrideUser,
  removeAutoScheduleOverrideUser,
  resetAutoScheduleOverrides,
} from "@/lib/actions/autoSchedule";
import {
  SITE_LABELS,
  formatDayLabel,
  formatMonthLabel,
  findSlotDef,
  formatHoursRange,
} from "@/lib/planning";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import PlanningMonthNav from "@/components/PlanningMonthNav";
import PlanningAssignSelect from "@/components/PlanningAssignSelect";

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

  const [{ shifts, assignmentCountByUser }, activeUsers] = await Promise.all([
    computeAutoScheduleForMonth(year, month),
    prisma.user.findMany({
      where: { active: true, unavailableForOpenings: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

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
  const overriddenCount = shifts.filter((s) => s.manuallyOverridden).length;

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
          rien). Le poste Sortie est réservé au/à la responsable
          d&rsquo;ouverture (ou, à défaut, un·e bénévole de niveau Sortie),
          Retour et Accueil aux bénévoles qualifié·e·s ; le samedi ajoute
          une place Anim./accueil ouverte à tou·te·s. À Gland, la seule
          place reste strictement réservée au/à la responsable, sans
          bénévole de repli. Vous pouvez corriger un·e bénévole directement
          ci-dessous (× pour retirer, liste déroulante pour ajouter) sans
          relancer tout le calcul. Purement consultatif tant que vous ne
          cliquez pas sur « Appliquer » plus bas — le planning normal
          n&rsquo;est pas modifié entre-temps.
        </p>

        {(missingResponsableCount > 0 || understaffedCount > 0) && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {understaffedCount > 0 &&
              `${understaffedCount} créneau${understaffedCount > 1 ? "x" : ""} incomplet${understaffedCount > 1 ? "s" : ""} (pas assez de monde disponible). `}
            {missingResponsableCount > 0 &&
              `${missingResponsableCount} créneau${missingResponsableCount > 1 ? "x" : ""} sans responsable/comité disponible.`}
          </p>
        )}

        {overriddenCount > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <span>
              ✏️ {overriddenCount} créneau{overriddenCount > 1 ? "x" : ""} modifié
              {overriddenCount > 1 ? "s" : ""} manuellement ce mois-ci.
            </span>
            <form action={resetAutoScheduleOverrides}>
              <input type="hidden" name="year" value={year} />
              <input type="hidden" name="month" value={month} />
              <button
                type="submit"
                className="text-xs font-medium text-amber-900 underline hover:text-red-700"
              >
                🔄 Réinitialiser et recommencer depuis le calcul automatique
              </button>
            </form>
          </div>
        )}
      </section>

      <section>
        <ul className="space-y-3">
          {shifts.map((shift) => {
            const slot = findSlotDef(shift.site, shift.periode);
            const alert = shift.missingResponsable || shift.understaffed;
            const availableUsers = activeUsers.filter(
              (u) => !shift.assignees.some((a) => a.userId === u.id)
            );
            return (
              <li
                key={`${shift.dateKeyStr}-${shift.site}-${shift.periode}`}
                data-testid={`shift-${shift.dateKeyStr}-${shift.site}-${shift.periode}`}
                className={`rounded-xl border p-4 ${
                  alert ? "border-red-200 bg-red-50" : "border-stone-200 bg-white"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-stone-900">
                    {formatDayLabel(shift.date)} · {shift.groupLabel} · {SITE_LABELS[shift.site]}
                    {shift.manuallyOverridden && (
                      <span className="ml-2 text-xs font-normal text-amber-600">
                        ✏️ modifié manuellement
                      </span>
                    )}
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
                        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
                          a.isResponsableSeat
                            ? "bg-stone-900 text-white"
                            : "bg-brand-blue-soft text-brand-blue-dark"
                        }`}
                      >
                        <span>
                          {a.name} · {a.seatLabel}
                          {a.isResponsableSeat ? ` (${ROLE_LABELS[a.role as Role] ?? a.role})` : ""}
                        </span>
                        <form action={removeAutoScheduleOverrideUser}>
                          <input type="hidden" name="date" value={shift.dateKeyStr} />
                          <input type="hidden" name="site" value={shift.site} />
                          <input type="hidden" name="periode" value={shift.periode} />
                          <input type="hidden" name="userId" value={a.userId} />
                          <button
                            type="submit"
                            className={`hover:text-red-400 ${
                              a.isResponsableSeat ? "text-stone-300" : "text-brand-blue-dark/50"
                            }`}
                            aria-label={`Retirer ${a.name}`}
                          >
                            ×
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
                {shift.missingResponsable && (
                  <p className="mt-1 text-xs text-red-600">
                    Aucun·e responsable/comité disponible pour ce créneau.
                  </p>
                )}
                {availableUsers.length > 0 && (
                  <PlanningAssignSelect
                    action={addAutoScheduleOverrideUser}
                    date={shift.dateKeyStr}
                    site={shift.site}
                    periode={shift.periode}
                    options={availableUsers}
                  />
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
            proposition (corrections manuelles comprises) — irréversible,
            sauf à réassigner manuellement ensuite.
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
