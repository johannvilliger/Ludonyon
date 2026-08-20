import { addVacation, deleteVacation } from "@/lib/actions/profile";
import { formatDateOnly } from "@/lib/format";

type Vacation = { id: string; startDate: Date; endDate: Date };

export default function VacationsForm({
  vacations,
}: {
  vacations: Vacation[];
}) {
  return (
    <div className="mt-3 rounded-xl border border-stone-200 bg-white p-4">
      {vacations.length === 0 ? (
        <p className="text-sm text-stone-400">
          Aucune période d’indisponibilité déclarée.
        </p>
      ) : (
        <ul className="space-y-2">
          {vacations.map((v) => (
            <li
              key={v.id}
              className="flex items-center justify-between gap-2 text-sm text-stone-700"
            >
              <span>
                {formatDateOnly(v.startDate)} – {formatDateOnly(v.endDate)}
              </span>
              <form action={deleteVacation}>
                <input type="hidden" name="id" value={v.id} />
                <button
                  type="submit"
                  className="text-xs text-red-600 hover:underline"
                >
                  Supprimer
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form
        action={addVacation}
        className="mt-4 flex flex-wrap items-end gap-2 border-t border-stone-100 pt-4"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-700">
            Du
          </label>
          <input
            type="date"
            name="startDate"
            required
            className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-700">
            Au
          </label>
          <input
            type="date"
            name="endDate"
            required
            className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg border-2 border-black bg-brand-yellow px-3 py-1.5 text-sm font-semibold text-black transition hover:bg-brand-yellow-dark"
        >
          Ajouter
        </button>
      </form>
    </div>
  );
}
