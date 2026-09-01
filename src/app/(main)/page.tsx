import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatEventDate, formatDateTime } from "@/lib/format";
import { isOrganisationRole } from "@/lib/roles";
import {
  SITE_LABELS,
  buildClosureLabelByDate,
  dateKey,
  findSlotDef,
  formatDayLabel,
  formatHoursRange,
  type Periode,
  type Site,
} from "@/lib/planning";

export default async function HomePage() {
  const user = await requireUser();
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

  const [candidateShifts, closures, events, announcements] = await Promise.all([
    prisma.openingShiftAssignee.findMany({
      where: { userId: user.id, shift: { date: { gte: todayUTC } } },
      include: { shift: true },
      orderBy: { shift: { date: "asc" } },
      // On sur-récupère avant de filtrer les créneaux tombant sur une
      // fermeture globale (vacances de la ludothèque), pour garder 5
      // ouvertures valides même si certaines proches sont fermées.
      take: 20,
    }),
    prisma.planningClosure.findMany({
      where: { endDate: { gte: todayUTC } },
      orderBy: { startDate: "asc" },
    }),
    prisma.event.findMany({
      where: { active: true, audience: "ALL", startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      include: {
        signups: { select: { userId: true } },
      },
    }),
    prisma.announcement.findMany({
      where: isOrganisationRole(user.role)
        ? undefined
        : {
            OR: [
              { audience: "ALL" },
              { audience: "GROUP", group: { members: { some: { userId: user.id } } } },
            ],
          },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { author: { select: { name: true } }, group: { select: { name: true } } },
    }),
  ]);

  const closureByDate = buildClosureLabelByDate(closures);
  const myShifts = candidateShifts
    .filter((a) => !closureByDate.has(dateKey(a.shift.date)))
    .slice(0, 5);

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
            Mes prochaines ouvertures
          </h2>
          <Link
            href="/planning"
            className="text-sm text-brand-blue hover:underline"
          >
            Voir tout
          </Link>
        </div>
        {myShifts.length === 0 ? (
          <p className="text-sm text-stone-400">
            Aucune ouverture à venir pour l’instant.
          </p>
        ) : (
          <ul className="space-y-3">
            {myShifts.map((a) => {
              const site = a.shift.site as Site;
              const periode = a.shift.periode as Periode;
              const slot = findSlotDef(site, periode);
              return (
                <li
                  key={a.id}
                  className={`rounded-xl border-2 p-4 ${
                    a.seekingReplacement
                      ? "border-red-300 bg-red-50"
                      : "border-brand-blue bg-brand-blue-soft"
                  }`}
                >
                  <p className="font-medium text-stone-900">
                    {formatDayLabel(a.shift.date)} — {SITE_LABELS[site]}
                    {a.seekingReplacement && " ⏳"}
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    {slot ? formatHoursRange(slot.start, slot.end) : ""}
                  </p>
                  {a.seekingReplacement && (
                    <p className="mt-1 text-xs text-red-700">
                      En attente de remplaçant·e
                    </p>
                  )}
                </li>
              );
            })}
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
            {events.map((event) => {
              const isSignedUp = event.signups.some((s) => s.userId === user.id);
              return (
                <li
                  key={event.id}
                  className={`rounded-xl border-2 p-4 ${
                    isSignedUp
                      ? "border-brand-blue bg-brand-blue-soft"
                      : "border-stone-200 bg-white"
                  }`}
                >
                  <Link
                    href={`/evenements/${event.id}`}
                    className="font-medium text-stone-900 hover:underline"
                  >
                    {event.title}
                  </Link>
                  <p className="mt-1 text-sm text-stone-600">
                    {formatEventDate(event.startsAt, event.endsAt)}
                    {event.location ? ` · ${event.location}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-stone-400">
                    {isSignedUp
                      ? "Vous êtes inscrit·e"
                      : `${event.signups.length} bénévole${event.signups.length > 1 ? "s" : ""} inscrit${event.signups.length > 1 ? "s" : ""}`}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
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
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-stone-900">{a.title}</p>
                  {a.audience === "GROUP" && a.group && (
                    <span className="rounded-full bg-brand-blue-soft px-2 py-0.5 text-xs text-brand-blue-dark">
                      Groupe : {a.group.name}
                    </span>
                  )}
                </div>
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
    </div>
  );
}
