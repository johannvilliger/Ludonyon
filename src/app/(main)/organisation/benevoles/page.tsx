import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOrganisationUser } from "@/lib/session";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/roles";
import { POSTES, POSTE_LABELS, type Poste } from "@/lib/postes";
import { formatDateOnly } from "@/lib/format";
import { mailConfigured } from "@/lib/mail";
import Avatar from "@/components/Avatar";
import PhotoUploadField from "@/components/PhotoUploadField";
import AvailabilityForm from "@/components/AvailabilityForm";
import {
  createVolunteer,
  updateVolunteerRole,
  archiveVolunteer,
  unarchiveVolunteer,
  deleteVolunteer,
  resetVolunteerPassword,
  updateVolunteerPhoto,
  updateVolunteerAvailability,
  updateVolunteerPoste,
} from "@/lib/actions/organisation";

export default async function OrganisationBenevolesPage({
  searchParams,
}: {
  searchParams: Promise<{ filtre?: string }>;
}) {
  const currentUser = await requireOrganisationUser();
  const { filtre } = await searchParams;
  const showArchived = filtre === "archives";

  const users = await prisma.user.findMany({
    where: { active: !showArchived },
    orderBy: { name: "asc" },
    include: {
      vacations: { orderBy: { startDate: "asc" } },
      availabilities: { select: { slotKey: true } },
    },
  });

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-medium text-stone-900">
          Ajouter un·e bénévole
        </h2>
        <p className="mt-1 text-xs text-stone-400">
          {mailConfigured()
            ? "Un email avec les identifiants sera envoyé automatiquement à la personne."
            : "Serveur d'envoi d'emails non configuré (voir Paramètres) : communiquez les identifiants manuellement."}
        </p>
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-stone-900">
            {showArchived ? "Comptes archivés" : "Comptes existants"}
          </h2>
          <div className="flex gap-1 rounded-lg border border-stone-200 bg-white p-1 text-sm">
            <Link
              href="/organisation/benevoles"
              className={
                !showArchived
                  ? "rounded-md bg-stone-900 px-3 py-1 text-white"
                  : "rounded-md px-3 py-1 text-stone-600 hover:bg-stone-100"
              }
            >
              Actifs
            </Link>
            <Link
              href="/organisation/benevoles?filtre=archives"
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
        {showArchived && users.length === 0 && (
          <p className="mt-3 text-sm text-stone-400">
            Aucun compte archivé.
          </p>
        )}
        <ul className="mt-3 space-y-3">
          {users.map((u) => {
            const isSelf = u.id === currentUser.id;
            return (
              <li
                key={u.id}
                className="rounded-xl border border-stone-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Avatar name={u.name} photoPath={u.photoPath} />
                    <div>
                      <p className="font-medium text-stone-900">{u.name}</p>
                      <p className="text-sm text-stone-600">{u.email}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <form
                      action={updateVolunteerRole}
                      className="flex items-center gap-2"
                    >
                      <input type="hidden" name="id" value={u.id} />
                      <select
                        key={u.role}
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

                    {u.role === "BENEVOLE" && (
                      <form
                        action={updateVolunteerPoste}
                        className="flex items-center gap-2"
                      >
                        <input type="hidden" name="id" value={u.id} />
                        <select
                          key={u.poste ?? "none"}
                          name="poste"
                          defaultValue={u.poste ?? ""}
                          className="rounded-lg border border-stone-300 px-2 py-1 text-sm"
                        >
                          <option value="">Poste : non défini</option>
                          {POSTES.map((poste) => (
                            <option key={poste} value={poste}>
                              {POSTE_LABELS[poste as Poste]}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="rounded-lg border border-stone-300 px-2 py-1 text-xs text-stone-600 hover:bg-stone-100"
                        >
                          Enregistrer
                        </button>
                      </form>
                    )}

                    {!isSelf && !showArchived && (
                      <form action={archiveVolunteer}>
                        <input type="hidden" name="id" value={u.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-stone-300 px-2 py-1 text-xs text-stone-600 hover:bg-stone-100"
                        >
                          Archiver
                        </button>
                      </form>
                    )}
                    {showArchived && (
                      <form action={unarchiveVolunteer}>
                        <input type="hidden" name="id" value={u.id} />
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

                {u.vacations.length > 0 && (
                  <details className="mt-2" open>
                    <summary className="cursor-pointer text-xs text-stone-400 hover:text-stone-600">
                      Vacances / indisponibilités déclarées
                    </summary>
                    <ul className="mt-2 space-y-1 text-sm text-stone-600">
                      {u.vacations.map((v) => (
                        <li key={v.id}>
                          {formatDateOnly(v.startDate)} –{" "}
                          {formatDateOnly(v.endDate)}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-stone-400 hover:text-stone-600">
                    Disponibilités pour le planning des ouvertures
                  </summary>
                  <div className="mt-2">
                    <AvailabilityForm
                      action={updateVolunteerAvailability}
                      selectedKeys={u.availabilities.map((a) => a.slotKey)}
                      extraFields={{ id: u.id }}
                    />
                  </div>
                </details>

                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-stone-400 hover:text-stone-600">
                    Changer la photo
                  </summary>
                  <div className="mt-2">
                    <PhotoUploadField
                      action={updateVolunteerPhoto}
                      extraFields={{ id: u.id }}
                      buttonClassName="rounded-lg border border-stone-300 px-2 py-1 text-xs text-stone-600 hover:bg-stone-100 disabled:opacity-60"
                    />
                  </div>
                </details>

                {showArchived && !isSelf && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-red-500 hover:text-red-700">
                      Supprimer définitivement
                    </summary>
                    <div className="mt-2 rounded-lg bg-red-50 p-3">
                      <p className="text-xs text-red-700">
                        Tout ce qui est lié à ce compte disparaîtra
                        définitivement : présences et heures enregistrées sur
                        les événements passés, tâches assignées, vacances
                        déclarées. Cette action est irréversible.
                      </p>
                      <form action={deleteVolunteer} className="mt-2">
                        <input type="hidden" name="id" value={u.id} />
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
            );
          })}
        </ul>
      </section>
    </div>
  );
}
