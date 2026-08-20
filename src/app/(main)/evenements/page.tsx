import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatEventDate } from "@/lib/format";
import SignupButton from "./SignupButton";

export default async function EvenementsPage() {
  const user = await requireUser();

  const events = await prisma.event.findMany({
    where: { startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
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
        Inscrivez-vous aux animations et permanences à venir.
      </p>

      {events.length === 0 ? (
        <p className="mt-6 text-sm text-stone-400">
          Aucun événement à venir pour l’instant.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {events.map((event) => {
            const isSignedUp = event.signups.some(
              (s) => s.userId === user.id
            );
            return (
              <li
                key={event.id}
                className="rounded-xl border border-stone-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-stone-900">
                      {event.title}
                    </p>
                    <p className="mt-1 text-sm text-stone-600">
                      {formatEventDate(event.startsAt, event.endsAt)}
                      {event.location ? ` · ${event.location}` : ""}
                    </p>
                    {event.description && (
                      <p className="mt-2 text-sm text-stone-500 whitespace-pre-wrap">
                        {event.description}
                      </p>
                    )}
                  </div>
                  <SignupButton
                    eventId={event.id}
                    isSignedUp={isSignedUp}
                  />
                </div>
                {event.signups.length > 0 && (
                  <p className="mt-3 text-xs text-stone-400">
                    Inscrit·e·s :{" "}
                    {event.signups.map((s) => s.user.name).join(", ")}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
