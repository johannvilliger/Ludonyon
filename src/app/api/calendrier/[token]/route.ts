import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildIcsCalendar, buildIcsEvent } from "@/lib/ics";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const user = await prisma.user.findUnique({
    where: { calendarToken: token },
    select: {
      id: true,
      signups: {
        include: { event: true },
      },
      taskAssignees: {
        include: { task: { include: { event: { select: { title: true, location: true } } } } },
      },
    },
  });
  if (!user) {
    return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
  }

  const events = [
    ...user.signups.map(({ event }) =>
      buildIcsEvent({
        uid: `event-${event.id}@ludonyon`,
        summary: event.title,
        description: event.description,
        location: event.location,
        start: event.startsAt,
        end: event.endsAt,
      })
    ),
    ...user.taskAssignees.map(({ task }) =>
      buildIcsEvent({
        uid: `task-${task.id}@ludonyon`,
        summary: `Tâche : ${task.title}`,
        description: `Événement lié : ${task.event.title}`,
        location: task.event.location,
        allDay: true,
        date: task.dueDate,
      })
    ),
  ];

  const ics = buildIcsCalendar(events);

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
