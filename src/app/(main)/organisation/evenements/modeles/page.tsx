import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOrganisationUser } from "@/lib/session";
import {
  createEventTemplate,
  deleteEventTemplate,
  addTaskTemplate,
  updateTaskTemplate,
  deleteTaskTemplate,
} from "@/lib/actions/organisation";

function daysLabel(days: number): string {
  if (days === 0) return "jour même";
  return days > 0 ? `${days} j avant` : `${Math.abs(days)} j après`;
}

export default async function EventTemplatesPage() {
  await requireOrganisationUser();

  const templates = await prisma.eventTemplate.findMany({
    orderBy: { name: "asc" },
    include: { taskTemplates: { orderBy: { order: "asc" } } },
  });

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/organisation/evenements"
          className="text-sm text-brand-blue hover:underline"
        >
          ← Retour aux événements
        </Link>
      </div>

      <section>
        <h2 className="text-lg font-medium text-stone-900">
          Nouveau modèle d&rsquo;événement
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          Pour un événement qui revient chaque année à une date différente
          (ex. le troc annuel) : le titre/description/lieu par défaut, et une
          liste de tâches type dont l&rsquo;échéance sera calculée par
          rapport à la date choisie à chaque création.
        </p>
        <form
          action={createEventTemplate}
          className="mt-3 space-y-3 rounded-xl border border-stone-200 bg-white p-4"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">
              Nom du modèle (usage interne)
            </label>
            <input
              type="text"
              name="name"
              required
              maxLength={200}
              placeholder="Troc annuel"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">
              Titre de l&rsquo;événement
            </label>
            <input
              type="text"
              name="title"
              required
              maxLength={200}
              placeholder="Troc de jouets"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
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
          <button
            type="submit"
            className="rounded-lg border-2 border-black bg-brand-yellow px-4 py-2 text-sm font-semibold text-black transition hover:bg-brand-yellow-dark"
          >
            Créer le modèle
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-medium text-stone-900">
          Modèles existants
        </h2>
        {templates.length === 0 ? (
          <p className="mt-2 text-sm text-stone-400">Aucun modèle pour l&rsquo;instant.</p>
        ) : (
          <ul className="mt-3 space-y-4">
            {templates.map((template) => (
              <li
                key={template.id}
                className="rounded-xl border border-stone-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-stone-900">
                      {template.name}
                    </p>
                    <p className="text-sm text-stone-600">
                      {template.title}
                      {template.location ? ` · ${template.location}` : ""}
                      {template.paid ? " · Rémunéré" : ""}
                    </p>
                  </div>
                  <form action={deleteEventTemplate}>
                    <input type="hidden" name="id" value={template.id} />
                    <button
                      type="submit"
                      className="text-sm text-red-600 hover:underline"
                    >
                      Supprimer
                    </button>
                  </form>
                </div>

                <div className="mt-3 border-t border-stone-100 pt-3">
                  <p className="text-sm font-medium text-stone-700">
                    Tâches type
                  </p>
                  {template.taskTemplates.length === 0 ? (
                    <p className="mt-1 text-xs text-stone-400">
                      Aucune tâche pour l&rsquo;instant.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1.5">
                      {template.taskTemplates.map((tt) => (
                        <li
                          key={tt.id}
                          className="rounded-lg bg-stone-50 px-3 py-1.5 text-sm"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-stone-700">
                              {tt.title}
                              <span className="ml-2 text-xs text-stone-400">
                                {daysLabel(tt.daysBeforeEvent)}
                                {tt.reminderDaysBefore !== null &&
                                  ` · rappel ${tt.reminderDaysBefore === 0 ? "le jour même de l’échéance" : `${tt.reminderDaysBefore} j avant l’échéance`}`}
                              </span>
                            </span>
                            <div className="flex shrink-0 items-center gap-3">
                              <details>
                                <summary className="cursor-pointer list-none text-xs text-brand-blue hover:underline">
                                  Modifier
                                </summary>
                                <form
                                  action={updateTaskTemplate}
                                  className="mt-2 w-72 max-w-full space-y-2 rounded-lg border border-stone-200 bg-white p-3"
                                >
                                  <input type="hidden" name="id" value={tt.id} />
                                  <div>
                                    <label className="mb-1 block text-xs font-medium text-stone-700">
                                      Titre
                                    </label>
                                    <input
                                      type="text"
                                      name="title"
                                      required
                                      maxLength={200}
                                      defaultValue={tt.title}
                                      className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs font-medium text-stone-700">
                                      Description
                                    </label>
                                    <textarea
                                      name="description"
                                      rows={2}
                                      maxLength={2000}
                                      defaultValue={tt.description ?? ""}
                                      className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs font-medium text-stone-700">
                                      Jours avant l&rsquo;événement (négatif = après)
                                    </label>
                                    <input
                                      type="number"
                                      name="daysBeforeEvent"
                                      required
                                      defaultValue={tt.daysBeforeEvent}
                                      className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs font-medium text-stone-700">
                                      Rappel (jours avant échéance)
                                    </label>
                                    <input
                                      type="number"
                                      name="reminderDaysBefore"
                                      min={0}
                                      placeholder="Aucun"
                                      defaultValue={tt.reminderDaysBefore ?? ""}
                                      className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                                    />
                                  </div>
                                  <button
                                    type="submit"
                                    className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100"
                                  >
                                    Enregistrer
                                  </button>
                                </form>
                              </details>
                              <form action={deleteTaskTemplate}>
                                <input type="hidden" name="id" value={tt.id} />
                                <button
                                  type="submit"
                                  className="text-xs text-red-500 hover:underline"
                                >
                                  Retirer
                                </button>
                              </form>
                            </div>
                          </div>
                          {tt.description && (
                            <p className="mt-1 text-xs text-stone-500">
                              {tt.description}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  <form
                    action={addTaskTemplate}
                    className="mt-3 space-y-2 rounded-lg border border-stone-200 p-3"
                  >
                    <input type="hidden" name="eventTemplateId" value={template.id} />
                    <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-stone-700">
                          Titre de la tâche
                        </label>
                        <input
                          type="text"
                          name="title"
                          required
                          maxLength={200}
                          className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-stone-700">
                          Jours avant l&rsquo;événement (négatif = après)
                        </label>
                        <input
                          type="number"
                          name="daysBeforeEvent"
                          required
                          className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-stone-700">
                          Rappel (jours avant échéance)
                        </label>
                        <input
                          type="number"
                          name="reminderDaysBefore"
                          min={0}
                          placeholder="Aucun"
                          className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                        />
                      </div>
                      <button
                        type="submit"
                        className="rounded-lg border-2 border-black bg-brand-yellow px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-brand-yellow-dark"
                      >
                        Ajouter
                      </button>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-stone-700">
                        Description (optionnel)
                      </label>
                      <textarea
                        name="description"
                        rows={2}
                        maxLength={2000}
                        className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                      />
                    </div>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
