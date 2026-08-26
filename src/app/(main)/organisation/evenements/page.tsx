import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOrganisationUser } from "@/lib/session";
import { formatEventDate } from "@/lib/format";
import {
  createEvent,
  createEventFromTemplate,
  archiveEvent,
  unarchiveEvent,
  deleteEvent,
} from "@/lib/actions/organisation";

export default async function OrganisationEvenementsPage({
  searchParams,
}: {
  searchParams: Promise<{ filtre?: string }>;
}) {
  const currentUser = await requireOrganisationUser();
  const isComite = currentUser.role === "COMITE";
  const { filtre } = await searchParams;
  const showArchived = filtre === "archives";

  const templates = await prisma.eventTemplate.findMany({
    orderBy: { name: "asc" },
  });

  const events = await prisma.event.findMany({
    // Les séances comité (audience "COMITE") restent invisibles pour les
    // responsables, même dans cette liste de gestion.
    where: {
      active: !showArchived,
      ...(isComite ? {} : { audience: "ALL" }),
    },
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
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
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
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">
                Fin (optionnel)
              </label>
              <input
                type="datetime-local"
                name="endsAt"
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
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
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
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
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              name="paid"
              className="h-4 w-4 rounded border-stone-300 text-brand-blue focus:ring-brand-blue"
            />
            Événement rémunéré
          </label>
          {isComite && (
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                name="committeeOnly"
                className="h-4 w-4 rounded border-stone-300 text-brand-blue focus:ring-brand-blue"
              />
              Réservé au comité (séance comité — invisible pour les
              responsables et bénévoles)
            </label>
          )}
          <button
            type="submit"
            className="rounded-lg border-2 border-black bg-brand-yellow px-4 py-2 text-sm font-semibold text-black transition hover:bg-brand-yellow-dark"
          >
            Créer l’événement
          </button>
        </form>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-stone-900">
            Créer depuis un modèle
          </h2>
          <Link
            href="/organisation/evenements/modeles"
            className="text-sm text-brand-blue hover:underline"
          >
            Gérer les modèles
          </Link>
        </div>
        {templates.length === 0 ? (
          <p className="mt-2 text-sm text-stone-400">
            Aucun modèle pour l&rsquo;instant (ex. le troc annuel) — créez-en
            un depuis &laquo;&nbsp;Gérer les modèles&nbsp;&raquo;.
          </p>
        ) : (
          <form
            action={createEventFromTemplate}
            className="mt-3 space-y-3 rounded-xl border border-stone-200 bg-white p-4"
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">
                Modèle
              </label>
              <select
                name="eventTemplateId"
                required
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
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
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">
                  Fin (optionnel)
                </label>
                <input
                  type="datetime-local"
                  name="endsAt"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                />
              </div>
            </div>
            <p className="text-xs text-stone-400">
              Les tâches du modèle seront générées automatiquement, avec une
              échéance calculée par rapport à la date de début choisie
              ci-dessus.
            </p>
            <button
              type="submit"
              className="rounded-lg border-2 border-black bg-brand-yellow px-4 py-2 text-sm font-semibold text-black transition hover:bg-brand-yellow-dark"
            >
              Créer l’événement depuis ce modèle
            </button>
          </form>
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-stone-900">
            {showArchived ? "Événements archivés" : "Tous les événements"}
          </h2>
          <div className="flex gap-1 rounded-lg border border-stone-200 bg-white p-1 text-sm">
            <Link
              href="/organisation/evenements"
              className={
                !showArchived
                  ? "rounded-md bg-stone-900 px-3 py-1 text-white"
                  : "rounded-md px-3 py-1 text-stone-600 hover:bg-stone-100"
              }
            >
              Actifs
            </Link>
            <Link
              href="/organisation/evenements?filtre=archives"
              className={
                showArchived
                  ? "rounded-md bg-stone-900 px-3 py-1 text-white"
                  : "rounded-md px-3 py-1 text-stone-600 hover:bg-stone-100"
              }
            >
              Archivés
            </Link>
          </div>
        </div>
        {showArchived && events.length === 0 && (
          <p className="mt-3 text-sm text-stone-400">Aucun événement archivé.</p>
        )}
        <ul className="mt-3 space-y-3">
          {events.map((event) => (
            <li
              key={event.id}
              className="rounded-xl border border-stone-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-stone-900">
                      {event.title}
                    </p>
                    {event.paid && (
                      <span className="rounded-full bg-brand-yellow-soft px-2 py-0.5 text-xs font-medium text-black">
                        Rémunéré
                      </span>
                    )}
                    {event.audience === "COMITE" && (
                      <span className="rounded-full bg-stone-900 px-2 py-0.5 text-xs font-medium text-white">
                        🔒 Comité
                      </span>
                    )}
                  </div>
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
                <div className="flex shrink-0 items-center gap-3">
                  <Link
                    href={`/organisation/evenements/${event.id}`}
                    className="text-sm text-brand-blue hover:underline"
                  >
                    Gérer
                  </Link>
                  {!showArchived && (
                    <form action={archiveEvent}>
                      <input type="hidden" name="id" value={event.id} />
                      <button
                        type="submit"
                        className="text-sm text-stone-500 hover:underline"
                      >
                        Archiver
                      </button>
                    </form>
                  )}
                  {showArchived && (
                    <form action={unarchiveEvent}>
                      <input type="hidden" name="id" value={event.id} />
                      <button
                        type="submit"
                        className="rounded-lg border-2 border-black bg-brand-yellow px-2 py-1 text-xs font-semibold text-black hover:bg-brand-yellow-dark"
                      >
                        Réactiver
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {showArchived && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-red-500 hover:text-red-700">
                    Supprimer définitivement
                  </summary>
                  <div className="mt-2 rounded-lg bg-red-50 p-3">
                    <p className="text-xs text-red-700">
                      Tout ce qui est lié à cet événement disparaîtra
                      définitivement : inscriptions, présences et heures
                      enregistrées, tâches associées. Cette action est
                      irréversible.
                    </p>
                    <form action={deleteEvent} className="mt-2">
                      <input type="hidden" name="id" value={event.id} />
                      <button
                        type="submit"
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                      >
                        Confirmer la suppression définitive
                      </button>
                    </form>
                  </div>
                </details>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
