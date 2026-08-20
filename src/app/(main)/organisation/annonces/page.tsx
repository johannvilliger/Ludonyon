import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { createAnnouncement, deleteAnnouncement } from "@/lib/actions/organisation";

export default async function OrganisationAnnoncesPage() {
  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
    include: { author: { select: { name: true } } },
  });

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-medium text-stone-900">
          Publier une annonce
        </h2>
        <form
          action={createAnnouncement}
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
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">
              Message
            </label>
            <textarea
              name="body"
              required
              rows={4}
              maxLength={5000}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600"
          >
            Publier
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-medium text-stone-900">
          Annonces publiées
        </h2>
        <ul className="mt-3 space-y-3">
          {announcements.map((a) => (
            <li
              key={a.id}
              className="rounded-xl border border-stone-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-stone-900">{a.title}</p>
                  <p className="mt-1 text-sm text-stone-600 whitespace-pre-wrap">
                    {a.body}
                  </p>
                  <p className="mt-2 text-xs text-stone-400">
                    {a.author.name} · {formatDateTime(a.createdAt)}
                  </p>
                </div>
                <form action={deleteAnnouncement}>
                  <input type="hidden" name="id" value={a.id} />
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
