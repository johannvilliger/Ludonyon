import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatEventDate, formatDateTime } from "@/lib/format";
import { isOrganisationRole } from "@/lib/roles";

export default async function HomePage() {
  const user = await requireUser();

  const [announcements, events] = await Promise.all([
    prisma.announcement.findMany({
      where: isOrganisationRole(user.role) ? undefined : { audience: "ALL" },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { author: { select: { name: true } } },
    }),
    prisma.event.findMany({
      where: { startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 3,
      include: {
        signups: { select: { userId: true } },
      },
    }),
  ]);

  const firstName = (user.name ?? user.email ?? "").split(" ")[0];

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-semibold text-stone-900">
          Bonjour {firstName} 👋
        </h1>
        <p className="mt-1 text-stone-500">
          Bienvenue sur l’espace des bénévoles de la Ludothèque Nyon Région.
        </p>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium text-stone-900">
            Dernières annonces
          </h2>
          <Link
            href="/annonces"
            className="text-sm text-brand-blue hover:underline"
          >
            Voir tout
          </Link>
        </div>
        {announcements.length === 0 ? (
          <p className="text-sm text-stone-400">Aucune annonce pour l’instant.</p>
        ) : (
          <ul className="space-y-3">
            {announcements.map((a) => (
              <li
                key={a.id}
                className="rounded-2xl border-2 border-dashed border-brand-blue bg-white p-4"
              >
                <p className="font-medium text-stone-900">{a.title}</p>
                <p className="mt-1 text-sm text-stone-600 whitespace-pre-wrap">
                  {a.body}
                </p>
                <p className="mt-2 text-xs text-stone-400">
                  {a.author.name} · {formatDateTime(a.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium text-stone-900">
            Prochains événements
          </h2>
          <Link
            href="/evenements"
            className="text-sm text-brand-blue hover:underline"
          >
            Voir tout
          </Link>
        </div>
        {events.length === 0 ? (
          <p className="text-sm text-stone-400">
            Aucun événement à venir pour l’instant.
          </p>
        ) : (
          <ul className="space-y-3">
            {events.map((event) => (
              <li
                key={event.id}
                className="rounded-xl border border-stone-200 bg-white p-4"
              >
                <p className="font-medium text-stone-900">{event.title}</p>
                <p className="mt-1 text-sm text-stone-600">
                  {formatEventDate(event.startsAt, event.endsAt)}
                  {event.location ? ` · ${event.location}` : ""}
                </p>
                <p className="mt-1 text-xs text-stone-400">
                  {event.signups.length} bénévole
                  {event.signups.length > 1 ? "s" : ""} inscrit
                  {event.signups.length > 1 ? "s" : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
