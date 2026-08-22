import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrganisationUser } from "@/lib/session";
import { canAccessEventAudience } from "@/lib/roles";
import {
  formatEventDate,
  formatTime,
  formatDuration,
  formatDateOnly,
} from "@/lib/format";
import Avatar from "@/components/Avatar";
import EventRecorder from "@/components/EventRecorder";
import SaveButton from "@/components/SaveButton";
import {
  addVolunteerToEvent,
  removeEventSignup,
  markArrival,
  markDeparture,
  addManualTime,
  toggleEventPaid,
  createTask,
  deleteTask,
  toggleTaskDone,
  updateEvent,
  updateEventAgenda,
  uploadEventRecording,
  deleteEventRecording,
} from "@/lib/actions/organisation";

function sessionMinutes(arrivedAt: Date, leftAt: Date | null): number {
  const end = leftAt ?? new Date();
  return (end.getTime() - arrivedAt.getTime()) / 60000;
}

// Format attendu par <input type="datetime-local">, en heure locale
// (serveur en Europe/Zurich).
function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export default async function OrganisationEvenementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await requireOrganisationUser();

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      signups: {
        include: {
          user: {
            select: { id: true, name: true, email: true, photoPath: true },
          },
          attendanceSessions: { orderBy: { arrivedAt: "asc" } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  // 404 plutôt qu'une redirection : ne révèle pas à un·e responsable
  // qu'une séance comité existe à cette adresse.
  if (!event || !canAccessEventAudience(event.audience, currentUser.role)) {
    notFound();
  }

  const availableUsers = await prisma.user.findMany({
    where: {
      active: true,
      id: { notIn: event.signups.map((s) => s.userId) },
      // Une séance comité ne se propose qu'à des membres du comité — pas
      // de bénévoles ni de responsables dans la liste d'ajout.
      ...(event.audience === "COMITE" ? { role: "COMITE" } : {}),
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const allUsers = await prisma.user.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const tasks = await prisma.task.findMany({
    where: { eventId: id },
    include: { assignees: { include: { user: { select: { id: true, name: true } } } } },
    orderBy: { dueDate: "asc" },
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

  const isEditable = event.active;

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
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-medium text-stone-900">
                {event.title}
              </h2>
              {event.audience === "COMITE" && (
                <span className="rounded-full bg-stone-900 px-2 py-0.5 text-xs font-medium text-white">
                  🔒 Comité
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-stone-600">
              {formatEventDate(event.startsAt, event.endsAt)}
              {event.location ? ` · ${event.location}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                event.paid
                  ? "bg-brand-yellow-soft text-black"
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

        {isEditable && (
          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-stone-400 hover:text-stone-600">
              Modifier l&rsquo;événement
            </summary>
            <form
              action={updateEvent}
              className="mt-2 space-y-3 rounded-xl border border-stone-200 bg-white p-4"
            >
              <input type="hidden" name="id" value={event.id} />
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">
                  Titre
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  maxLength={200}
                  defaultValue={event.title}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">
                    Début
                  </label>
                  <input
                    type="datetime-local"
                    name="startsAt"
                    required
                    defaultValue={toDatetimeLocalValue(event.startsAt)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">
                    Fin (optionnel)
                  </label>
                  <input
                    type="datetime-local"
                    name="endsAt"
                    defaultValue={event.endsAt ? toDatetimeLocalValue(event.endsAt) : ""}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">
                  Lieu
                </label>
                <input
                  type="text"
                  name="location"
                  maxLength={200}
                  defaultValue={event.location ?? ""}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  maxLength={5000}
                  defaultValue={event.description ?? ""}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-stone-700">
                <input
                  type="checkbox"
                  name="paid"
                  defaultChecked={event.paid}
                  className="h-4 w-4 rounded border-stone-300 text-brand-blue focus:ring-brand-blue"
                />
                Événement rémunéré
              </label>
              <SaveButton className="rounded-lg border-2 border-black bg-brand-yellow px-4 py-2 text-sm font-semibold text-black hover:bg-brand-yellow-dark disabled:opacity-60" />
            </form>
          </details>
        )}
      </div>

      <section>
        <h3 className="text-sm font-medium text-stone-700">Ordre du jour</h3>
        <form action={updateEventAgenda} className="mt-2">
          <input type="hidden" name="eventId" value={event.id} />
          <textarea
            key={event.agenda ?? ""}
            name="agenda"
            rows={4}
            maxLength={5000}
            defaultValue={event.agenda ?? ""}
            placeholder={"1. Point A\n2. Point B\n..."}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
          <SaveButton className="mt-2 rounded-lg border border-stone-300 px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100 disabled:opacity-60">
            Enregistrer l&rsquo;ordre du jour
          </SaveButton>
        </form>
      </section>

      <section>
        <h3 className="text-sm font-medium text-stone-700">
          Enregistrement audio
        </h3>
        {event.recordingPath ? (
          <div className="mt-2 space-y-2">
            <audio
              controls
              preload="none"
              src={`/api/organisation/evenements/${event.id}/recording`}
              className="w-full"
            />
            <form action={deleteEventRecording}>
              <input type="hidden" name="eventId" value={event.id} />
              <button
                type="submit"
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
              >
                Supprimer l&rsquo;enregistrement
              </button>
            </form>
          </div>
        ) : (
          <div className="mt-2">
            <EventRecorder action={uploadEventRecording} eventId={event.id} />
          </div>
        )}
      </section>

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
                  <div className="flex items-start gap-3">
                    <Avatar
                      name={signup.user.name}
                      photoPath={signup.user.photoPath}
                    />
                    <div>
                      <p className="font-medium text-stone-900">
                        {signup.user.name}
                      </p>
                      <p className="text-xs text-stone-500">
                        {signup.user.email}
                      </p>
                      <span
                        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${
                          signup.wantsReminder
                            ? "bg-brand-blue-soft text-brand-blue-dark"
                            : "bg-stone-100 text-stone-400"
                        }`}
                      >
                        🔔 {signup.wantsReminder ? "Rappel activé" : "Rappel désactivé"}
                      </span>
                    </div>
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
                          className="rounded-lg border-2 border-black bg-brand-yellow px-3 py-1.5 text-xs font-semibold text-black hover:bg-brand-yellow-dark"
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
                    className="w-24 rounded-lg border border-stone-300 px-2 py-1 text-xs focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
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
        <h3 className="text-sm font-medium text-stone-700">Tâches</h3>
        <p className="mt-1 text-xs text-stone-400">
          Optionnel — laissez vide si cet événement n’en a pas besoin.
        </p>

        {tasks.length > 0 && (
          <ul className="mt-3 space-y-2">
            {tasks.map((task) => (
              <li
                key={task.id}
                className={`rounded-xl border bg-white p-4 ${
                  task.done ? "border-stone-100" : "border-stone-200"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p
                      className={`font-medium ${
                        task.done
                          ? "text-stone-400 line-through"
                          : "text-stone-900"
                      }`}
                    >
                      {task.title}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      Échéance : {formatDateOnly(task.dueDate)} ·{" "}
                      {task.assignees.map((a) => a.user.name).join(", ")}
                    </p>
                    <a
                      href={`/api/taches/${task.id}/ics`}
                      className="mt-1 inline-block text-xs text-brand-blue hover:underline"
                    >
                      Ajouter à mon calendrier
                    </a>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <form action={toggleTaskDone}>
                      <input type="hidden" name="id" value={task.id} />
                      <button
                        type="submit"
                        className="rounded-lg border border-stone-300 px-2 py-1 text-xs text-stone-600 hover:bg-stone-100"
                      >
                        {task.done ? "Marquer à faire" : "Marquer fait"}
                      </button>
                    </form>
                    <form action={deleteTask}>
                      <input type="hidden" name="id" value={task.id} />
                      <input type="hidden" name="eventId" value={event.id} />
                      <button
                        type="submit"
                        className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        Supprimer
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form
          action={createTask}
          className="mt-3 space-y-3 rounded-xl border border-stone-200 bg-white p-4"
        >
          <input type="hidden" name="eventId" value={event.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">
                Titre
              </label>
              <input
                type="text"
                name="title"
                required
                maxLength={200}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">
                Date limite
              </label>
              <input
                type="date"
                name="dueDate"
                required
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">
              Assigné·e à (plusieurs choix possibles)
            </label>
            <select
              name="assigneeIds"
              multiple
              required
              size={Math.min(6, allUsers.length)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            >
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded-lg border-2 border-black bg-brand-yellow px-4 py-2 text-sm font-semibold text-black transition hover:bg-brand-yellow-dark"
          >
            Ajouter la tâche
          </button>
        </form>
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
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            >
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg border-2 border-black bg-brand-yellow px-4 py-2 text-sm font-semibold text-black transition hover:bg-brand-yellow-dark"
            >
              Ajouter
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
