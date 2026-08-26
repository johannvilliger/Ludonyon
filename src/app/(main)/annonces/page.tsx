import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { isOrganisationRole } from "@/lib/roles";

export default async function AnnoncesPage() {
  const user = await requireUser();

  const announcements = await prisma.announcement.findMany({
    where: isOrganisationRole(user.role)
      ? undefined
      : {
          OR: [
            { audience: "ALL" },
            { audience: "GROUP", group: { members: { some: { userId: user.id } } } },
          ],
        },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { name: true } }, group: { select: { name: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-900">Annonces</h1>
      <p className="mt-1 text-stone-500">
        Les nouvelles de l’équipe et de la ludothèque.
      </p>

      {announcements.length === 0 ? (
        <p className="mt-6 text-sm text-stone-400">
          Aucune annonce pour l’instant.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {announcements.map((a) => (
            <li
              key={a.id}
              className="rounded-2xl border-2 border-dashed border-brand-blue bg-white p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-stone-900">{a.title}</p>
                {a.audience === "ORGANISATION" && (
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                    Responsables/comité
                  </span>
                )}
                {a.audience === "GROUP" && a.group && (
                  <span className="rounded-full bg-brand-blue-soft px-2 py-0.5 text-xs text-brand-blue-dark">
                    Groupe : {a.group.name}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-stone-600 whitespace-pre-wrap">
                {a.body}
              </p>
              <p className="mt-3 text-xs text-stone-400">
                {a.author.name} · {formatDateTime(a.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
