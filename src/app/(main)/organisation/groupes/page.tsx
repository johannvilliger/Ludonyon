import { prisma } from "@/lib/prisma";
import { requireOrganisationUser } from "@/lib/session";
import {
  createGroup,
  deleteGroup,
  addGroupMember,
  removeGroupMember,
} from "@/lib/actions/organisation";

export default async function GroupsPage() {
  await requireOrganisationUser();

  const groups = await prisma.group.findMany({
    orderBy: { name: "asc" },
    include: {
      members: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { user: { name: "asc" } },
      },
    },
  });

  const activeUsers = await prisma.user.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-medium text-stone-900">Nouveau groupe</h2>
        <p className="mt-1 text-sm text-stone-500">
          Un groupe d&rsquo;activité (ex. « Déco/Brico », « Informatique »)
          permet de cibler ses membres lors de l&rsquo;envoi d&rsquo;une
          notification, indépendamment du rôle de chacun·e.
        </p>
        <form
          action={createGroup}
          className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-stone-200 bg-white p-4"
        >
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-stone-700">
              Nom du groupe
            </label>
            <input
              type="text"
              name="name"
              required
              maxLength={100}
              placeholder="Déco/Brico"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg border-2 border-black bg-brand-yellow px-4 py-2 text-sm font-semibold text-black transition hover:bg-brand-yellow-dark"
          >
            Créer le groupe
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-medium text-stone-900">
          Groupes existants
        </h2>
        {groups.length === 0 ? (
          <p className="mt-2 text-sm text-stone-400">
            Aucun groupe pour l&rsquo;instant.
          </p>
        ) : (
          <ul className="mt-3 space-y-4">
            {groups.map((group) => {
              const memberIds = new Set(group.members.map((m) => m.userId));
              const availableUsers = activeUsers.filter((u) => !memberIds.has(u.id));
              return (
                <li
                  key={group.id}
                  className="rounded-xl border border-stone-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-stone-900">{group.name}</p>
                    <form action={deleteGroup}>
                      <input type="hidden" name="id" value={group.id} />
                      <button
                        type="submit"
                        className="text-sm text-red-600 hover:underline"
                      >
                        Supprimer
                      </button>
                    </form>
                  </div>

                  {group.members.length === 0 ? (
                    <p className="mt-2 text-xs text-stone-400">
                      Aucun membre pour l&rsquo;instant.
                    </p>
                  ) : (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {group.members.map((m) => (
                        <li
                          key={m.id}
                          className="flex items-center gap-1 rounded-full bg-stone-100 py-1 pl-3 pr-1 text-sm text-stone-700"
                        >
                          {m.user.name}
                          <form action={removeGroupMember}>
                            <input type="hidden" name="id" value={m.id} />
                            <button
                              type="submit"
                              className="rounded-full px-1.5 text-xs text-stone-400 hover:text-red-600"
                              aria-label={`Retirer ${m.user.name} du groupe`}
                            >
                              ✕
                            </button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  )}

                  {availableUsers.length > 0 && (
                    <form
                      action={addGroupMember}
                      className="mt-3 flex flex-wrap items-center gap-2"
                    >
                      <input type="hidden" name="groupId" value={group.id} />
                      <select
                        name="userId"
                        required
                        className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                      >
                        {availableUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100"
                      >
                        Ajouter
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
