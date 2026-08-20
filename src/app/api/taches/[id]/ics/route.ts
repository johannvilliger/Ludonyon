import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { buildIcsCalendar, buildIcsEvent } from "@/lib/ics";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireUser();
  const { id } = await params;

  const task = await prisma.task.findUnique({
    where: { id },
    include: { event: { select: { title: true, location: true } } },
  });
  if (!task) {
    return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 });
  }

  const ics = buildIcsCalendar([
    buildIcsEvent({
      uid: `task-${task.id}@ludonyon`,
      summary: `Tâche : ${task.title}`,
      description: `Événement lié : ${task.event.title}`,
      location: task.event.location,
      allDay: true,
      date: task.dueDate,
    }),
  ]);

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="tache.ics"`,
    },
  });
}
