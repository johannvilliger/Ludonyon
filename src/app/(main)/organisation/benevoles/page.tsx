import { prisma } from "@/lib/prisma";
import { requireOrganisationUser } from "@/lib/session";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/roles";
import {
  createVolunteer,
  updateVolunteerRole,
  deleteVolunteer,
  resetVolunteerPassword,
} from "@/lib/actions/organisation";

export default async function OrganisationBenevolesPage() {
  const currentUser = await requireOrganisationUser();

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-medium text-stone-900">
          Ajouter un·e bénévole
        </h2>
        <form
          action={createVolunteer}
          className="mt-3 grid gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-2"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">
              Nom complet
            </label>
            <input
              type="text"
              name="name"
              required
              maxLength={200}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">
              Email
            </label>
            <input
              type="email"
              name="email"
              required
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">
              Téléphone
            </label>
            <input
              type="tel"
              name="phone"
              maxLength={50}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">
              Rôle
            </label>
            <select
              name="role"
              defaultValue="BENEVOLE"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-stone-700">
              Compétences / disponibilités
            </label>
            <input
              type="text"
              name="skills"
              maxLength={1000}
              placeholder="Ex : animation, samedis, prêt de jeux"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-stone-700">
              Mot de passe provisoire
            </label>
            <input
              type="text"
              name="password"
              required
              minLength={8}
              placeholder="À transmettre au/à la bénévole, à changer ensuite"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-lg border-2 border-black bg-brand-yellow px-4 py-2 text-sm font-semibold text-black transition hover:bg-brand-yellow-dark"
            >
              Créer le compte
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-medium text-stone-900">
          Comptes existants
        </h2>
        <ul className="mt-3 space-y-3">
          {users.map((u) => {
            const isSelf = u.id === currentUser.id;
            return (
              <li
                key={u.id}
                className="rounded-xl border border-stone-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-stone-900">{u.name}</p>
                    <p className="text-sm text-stone-600">{u.email}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <form
                      action={updateVolunteerRole}
                      className="flex items-center gap-2"
                    >
                      <input type="hidden" name="id" value={u.id} />
                      <select
                        name="role"
                        defaultValue={u.role}
                        disabled={isSelf}
                        className="rounded-lg border border-stone-300 px-2 py-1 text-sm disabled:opacity-50"
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role as Role]}
                          </option>
                        ))}
                      </select>
                      {!isSelf && (
                        <button
                          type="submit"
                          className="rounded-lg border border-stone-300 px-2 py-1 text-xs text-stone-600 hover:bg-stone-100"
                        >
                          Mettre à jour
                        </button>
                      )}
                    </form>

                    {!isSelf && (
                      <form action={deleteVolunteer}>
                        <input type="hidden" name="id" value={u.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                        >
                          Supprimer
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-stone-400 hover:text-stone-600">
                    Réinitialiser le mot de passe
                  </summary>
                  <form
                    action={resetVolunteerPassword}
                    className="mt-2 flex flex-wrap items-center gap-2"
                  >
                    <input type="hidden" name="id" value={u.id} />
                    <input
                      type="text"
                      name="password"
                      required
                      minLength={8}
                      placeholder="Nouveau mot de passe"
                      className="rounded-lg border border-stone-300 px-2 py-1 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                    />
                    <button
                      type="submit"
                      className="rounded-lg border border-stone-300 px-2 py-1 text-xs text-stone-600 hover:bg-stone-100"
                    >
                      Réinitialiser
                    </button>
                  </form>
                </details>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
