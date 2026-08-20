import { prisma } from "@/lib/prisma";
import { formatEventDate } from "@/lib/format";
import { createEvent, deleteEvent } from "@/lib/actions/organisation";

export default async function OrganisationEvenementsPage() {
  const events = await prisma.event.findMany({
    orderBy: { startsAt: "desc" },
    include: {
      signups: { include: { user: { select: { name: true } } } },
    },
  });

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-medium text-stone-900">
          Créer un événement
        </h2>
        <form
          action={createEvent}
          className="mt-3 space-y-3 rounded-xl border border-stone-200 bg-white p-4"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">
              Titre
            </label>
            <input
              type="text"
              name="title"
              required
              maxLength={200}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">
                Début
              </label>
              <input
                type="datetime-local"
                name="startsAt"
                required
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">
                Fin (optionnel)
              </label>
              <input
                type="datetime-local"
                name="endsAt"
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">
              Lieu
            </label>
            <input
              type="text"
              name="location"
              maxLength={200}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              placeholder="Ludothèque Nyon Région"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">
              Description
            </label>
            <textarea
              name="description"
              rows={3}
              maxLength={5000}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600"
          >
            Créer l’événement
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-medium text-stone-900">
          Tous les événements
        </h2>
        <ul className="mt-3 space-y-3">
          {events.map((event) => (
            <li
              key={event.id}
              className="rounded-xl border border-stone-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-stone-900">{event.title}</p>
                  <p className="mt-1 text-sm text-stone-600">
                    {formatEventDate(event.startsAt, event.endsAt)}
                    {event.location ? ` · ${event.location}` : ""}
                  </p>
                  <p className="mt-2 text-xs text-stone-400">
                    {event.signups.length === 0
                      ? "Aucune inscription"
                      : `Inscrit·e·s : ${event.signups
                          .map((s) => s.user.name)
                          .join(", ")}`}
                  </p>
                </div>
                <form action={deleteEvent}>
                  <input type="hidden" name="id" value={event.id} />
                  <button
                    type="submit"
                    className="shrink-0 text-sm text-red-600 hover:underline"
                  >
                    Supprimer
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
