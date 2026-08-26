import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatEventDate, formatDateOnly } from "@/lib/format";
import MySignupControls from "../MySignupControls";

export default async function EvenementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      signups: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  // Les séances comité ne sont jamais consultables ici, y compris par
  // accès direct à l'URL — voir /organisation/evenements pour le comité.
  if (!event || !event.active || event.audience !== "ALL") {
    notFound();
  }

  const tasks = await prisma.task.findMany({
    where: { eventId: id },
    include: { assignees: { include: { user: { select: { name: true } } } } },
    orderBy: { dueDate: "asc" },
  });
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

  const isUpcoming = (event.endsAt ?? event.startsAt) >= new Date();
  const mySignup = event.signups.find((s) => s.userId === user.id);

  return (
    <div>
      <Link
        href={isUpcoming ? "/evenements" : "/evenements?filtre=passes"}
        className="text-sm text-stone-500 hover:underline"
      >
        ← Tous les événements
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">
            {event.title}
          </h1>
          <p className="mt-1 text-stone-600">
            {formatEventDate(event.startsAt, event.endsAt)}
            {event.location ? ` · ${event.location}` : ""}
          </p>
        </div>
        {isUpcoming && (
          <MySignupControls
            eventId={event.id}
            isSignedUp={!!mySignup}
            wantsReminder={mySignup?.wantsReminder ?? false}
            seekingReplacement={mySignup?.seekingReplacement ?? false}
          />
        )}
      </div>

      {event.description && (
        <p className="mt-4 whitespace-pre-wrap text-stone-700">
          {event.description}
        </p>
      )}

      {isUpcoming && (
        <a
          href={`/api/evenements/${event.id}/ics`}
          className="mt-4 inline-block text-xs text-brand-blue hover:underline"
        >
          Ajouter à mon calendrier
        </a>
      )}

      {event.signups.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-medium text-stone-700">
            Inscrit·e·s
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            {event.signups.map((s) => s.user.name).join(", ")}
          </p>
        </div>
      )}

      {tasks.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-medium text-stone-700">Tâches</h2>
          <ul className="mt-2 space-y-2">
            {tasks.map((task) => {
              const isOverdue = !task.done && task.dueDate.getTime() < todayUTC.getTime();
              return (
                <li
                  key={task.id}
                  className={`rounded-xl border p-3 text-sm ${
                    isOverdue ? "border-red-200 bg-red-50" : "border-stone-200 bg-white"
                  }`}
                >
                  <p
                    className={
                      task.done
                        ? "font-medium text-stone-400 line-through"
                        : isOverdue
                          ? "font-medium text-red-700"
                          : "font-medium text-stone-900"
                    }
                  >
                    {task.title}
                  </p>
                  <p className={`mt-0.5 text-xs ${isOverdue ? "text-red-600" : "text-stone-500"}`}>
                    Échéance : {formatDateOnly(task.dueDate)}
                    {isOverdue && " · en retard"}
                    {" · "}
                    {task.assignees.length > 0
                      ? task.assignees.map((a) => a.user.name).join(", ")
                      : "Aucun·e assigné·e"}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
