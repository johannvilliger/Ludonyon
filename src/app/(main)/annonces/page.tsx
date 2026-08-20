import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";

export default async function AnnoncesPage() {
  await requireUser();

  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
    include: { author: { select: { name: true } } },
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
              className="rounded-xl border border-stone-200 bg-white p-4"
            >
              <p className="font-medium text-stone-900">{a.title}</p>
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
