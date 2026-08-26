import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatEventDate } from "@/lib/format";
import { fulfillReplacement } from "@/lib/actions/events";
import MySignupControls from "./MySignupControls";

export default async function EvenementsPage({
  searchParams,
}: {
  searchParams: Promise<{ filtre?: string }>;
}) {
  const user = await requireUser();
  const { filtre } = await searchParams;
  const showPast = filtre === "passes";

  const events = await prisma.event.findMany({
    // Les séances comité ne sont pas des événements auxquels on s'inscrit :
    // elles ne figurent jamais sur cette liste, y compris pour le comité
    // (géré depuis Espace organisation).
    where: {
      active: true,
      audience: "ALL",
      startsAt: showPast ? { lt: new Date() } : { gte: new Date() },
    },
    orderBy: { startsAt: showPast ? "desc" : "asc" },
    include: {
      signups: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-900">Événements</h1>
      <p className="mt-1 text-stone-500">
        {showPast
          ? "Historique des animations et permanences passées."
          : "Inscrivez-vous aux animations et permanences à venir."}
      </p>

      <div className="mt-4 flex gap-2 text-sm">
        <Link
          href="/evenements"
          className={
            !showPast
              ? "rounded-md bg-stone-900 px-3 py-1 text-white"
              : "rounded-md px-3 py-1 text-stone-600 hover:bg-stone-100"
          }
        >
          À venir
        </Link>
        <Link
          href="/evenements?filtre=passes"
          className={
            showPast
              ? "rounded-md bg-stone-900 px-3 py-1 text-white"
              : "rounded-md px-3 py-1 text-stone-600 hover:bg-stone-100"
          }
        >
          Passés
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="mt-6 text-sm text-stone-400">
          {showPast
            ? "Aucun événement passé."
            : "Aucun événement à venir pour l’instant."}
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {events.map((event) => {
            const mySignup = event.signups.find((s) => s.userId === user.id);
            const replacementNeeded = event.signups.filter(
              (s) => s.seekingReplacement && s.userId !== user.id
            );
            return (
              <li
                key={event.id}
                className="rounded-xl border border-stone-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
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
                    {event.description && (
                      <p className="mt-2 text-sm text-stone-500 whitespace-pre-wrap">
                        {event.description}
                      </p>
                    )}
                    {!showPast && (
                      <a
                        href={`/api/evenements/${event.id}/ics`}
                        className="mt-2 inline-block text-xs text-brand-blue hover:underline"
                      >
                        Ajouter à mon calendrier
                      </a>
                    )}
                  </div>
                  {!showPast && (
                    <MySignupControls
                      eventId={event.id}
                      isSignedUp={!!mySignup}
                      wantsReminder={mySignup?.wantsReminder ?? false}
                      seekingReplacement={mySignup?.seekingReplacement ?? false}
                    />
                  )}
                </div>
                {event.signups.length > 0 && (
                  <p className="mt-3 text-xs text-stone-400">
                    Inscrit·e·s :{" "}
                    {event.signups.map((s) => s.user.name).join(", ")}
                  </p>
                )}
                {!showPast && replacementNeeded.length > 0 && (
                  <ul className="mt-3 space-y-1.5 border-t border-stone-100 pt-3">
                    {replacementNeeded.map((s) => (
                      <li
                        key={s.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm"
                      >
                        <span className="text-red-700">
                          {s.user.name} cherche un·e remplaçant·e
                        </span>
                        <form action={fulfillReplacement}>
                          <input type="hidden" name="eventId" value={event.id} />
                          <input type="hidden" name="signupId" value={s.id} />
                          <button
                            type="submit"
                            className="rounded-lg border-2 border-black bg-brand-yellow px-2.5 py-1 text-xs font-semibold text-black hover:bg-brand-yellow-dark"
                          >
                            Je remplace
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
