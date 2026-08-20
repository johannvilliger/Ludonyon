import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrganisationUser } from "@/lib/session";
import { formatEventDate, formatTime, formatDuration } from "@/lib/format";
import {
  addVolunteerToEvent,
  removeEventSignup,
  markArrival,
  markDeparture,
  addManualTime,
  toggleEventPaid,
} from "@/lib/actions/organisation";

function sessionMinutes(arrivedAt: Date, leftAt: Date | null): number {
  const end = leftAt ?? new Date();
  return (end.getTime() - arrivedAt.getTime()) / 60000;
}

export default async function OrganisationEvenementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireOrganisationUser();

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      signups: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          attendanceSessions: { orderBy: { arrivedAt: "asc" } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!event) notFound();

  const availableUsers = await prisma.user.findMany({
    where: { id: { notIn: event.signups.map((s) => s.userId) } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const totalEventMinutes = event.signups.reduce(
    (sum, signup) =>
      sum +
      signup.attendanceSessions.reduce(
        (s, session) => s + sessionMinutes(session.arrivedAt, session.leftAt),
        0
      ),
    0
  );

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/organisation/evenements"
          className="text-sm text-stone-500 hover:underline"
        >
          ← Tous les événements
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium text-stone-900">
              {event.title}
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              {formatEventDate(event.startsAt, event.endsAt)}
              {event.location ? ` · ${event.location}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                event.paid
                  ? "bg-amber-100 text-amber-700"
                  : "bg-stone-100 text-stone-600"
              }`}
            >
              {event.paid ? "Rémunéré" : "Bénévole"}
            </span>
            <form action={toggleEventPaid}>
              <input type="hidden" name="id" value={event.id} />
              <button
                type="submit"
                className="rounded-lg border border-stone-300 px-2 py-1 text-xs text-stone-600 hover:bg-stone-100"
              >
                {event.paid ? "Marquer bénévole" : "Marquer rémunéré"}
              </button>
            </form>
          </div>
        </div>
      </div>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-stone-700">
            Présences — total : {formatDuration(totalEventMinutes)}
          </h3>
          <a
            href={`/api/organisation/evenements/${event.id}/export`}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100"
          >
            Exporter en CSV
          </a>
        </div>

        <ul className="mt-3 space-y-3">
          {event.signups.length === 0 && (
            <p className="text-sm text-stone-400">
              Aucun·e bénévole inscrit·e pour l’instant.
            </p>
          )}
          {event.signups.map((signup) => {
            const openSession = signup.attendanceSessions.find(
              (s) => s.leftAt === null
            );
            const totalMinutes = signup.attendanceSessions.reduce(
              (s, session) =>
                s + sessionMinutes(session.arrivedAt, session.leftAt),
              0
            );
            return (
              <li
                key={signup.id}
                className="rounded-xl border border-stone-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-stone-900">
                      {signup.user.name}
                    </p>
                    <p className="text-xs text-stone-500">
                      {signup.user.email}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        openSession
                          ? "bg-green-100 text-green-700"
                          : "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {openSession ? "Présent·e" : "Absent·e"}
                    </span>
                    <span className="text-xs text-stone-500">
                      Total : {formatDuration(totalMinutes)}
                    </span>
                    {openSession ? (
                      <form action={markDeparture}>
                        <input
                          type="hidden"
                          name="eventSignupId"
                          value={signup.id}
                        />
                        <input
                          type="hidden"
                          name="eventId"
                          value={event.id}
                        />
                        <button
                          type="submit"
                          className="rounded-lg bg-stone-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-800"
                        >
                          Marquer le départ
                        </button>
                      </form>
                    ) : (
                      <form action={markArrival}>
                        <input
                          type="hidden"
                          name="eventSignupId"
                          value={signup.id}
                        />
                        <input
                          type="hidden"
                          name="eventId"
                          value={event.id}
                        />
                        <button
                          type="submit"
                          className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600"
                        >
                          Marquer l’arrivée
                        </button>
                      </form>
                    )}
                    <form action={removeEventSignup}>
                      <input type="hidden" name="signupId" value={signup.id} />
                      <input type="hidden" name="eventId" value={event.id} />
                      <button
                        type="submit"
                        className="rounded-lg border border-red-200 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50"
                      >
                        Retirer
                      </button>
                    </form>
                  </div>
                </div>
                {signup.attendanceSessions.length > 0 && (
                  <p className="mt-2 text-xs text-stone-400">
                    {signup.attendanceSessions
                      .map((s) =>
                        s.manual
                          ? `+${formatDuration(
                              sessionMinutes(s.arrivedAt, s.leftAt)
                            )} (ajout manuel)`
                          : `${formatTime(s.arrivedAt)}–${
                              s.leftAt ? formatTime(s.leftAt) : "en cours"
                            }`
                      )
                      .join(", ")}
                  </p>
                )}
                <form
                  action={addManualTime}
                  className="mt-2 flex items-center gap-2"
                >
                  <input type="hidden" name="eventSignupId" value={signup.id} />
                  <input type="hidden" name="eventId" value={event.id} />
                  <input
                    type="number"
                    name="minutes"
                    min={1}
                    max={1440}
                    placeholder="Minutes"
                    required
                    className="w-24 rounded-lg border border-stone-300 px-2 py-1 text-xs focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    type="submit"
                    className="rounded-lg border border-stone-300 px-2 py-1 text-xs text-stone-600 hover:bg-stone-100"
                  >
                    Ajouter du temps manuellement
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h3 className="text-sm font-medium text-stone-700">
          Ajouter un·e bénévole manuellement
        </h3>
        {availableUsers.length === 0 ? (
          <p className="mt-2 text-sm text-stone-400">
            Tous les comptes sont déjà inscrit·e·s à cet événement.
          </p>
        ) : (
          <form
            action={addVolunteerToEvent}
            className="mt-3 flex flex-wrap items-center gap-2"
          >
            <input type="hidden" name="eventId" value={event.id} />
            <select
              name="userId"
              required
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600"
            >
              Ajouter
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
