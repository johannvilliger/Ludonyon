import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganisationUser } from "@/lib/session";
import { canAccessEventAudience } from "@/lib/roles";

function sessionMinutes(arrivedAt: Date, leftAt: Date | null): number {
  const end = leftAt ?? new Date();
  return (end.getTime() - arrivedAt.getTime()) / 60000;
}

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireOrganisationUser();
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      signups: {
        include: {
          user: { select: { name: true, email: true } },
          attendanceSessions: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!event || !canAccessEventAudience(event.audience, user.role)) {
    return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
  }

  const rows = [["Bénévole", "Email", "Statut", "Passages", "Temps total (minutes)"]];
  for (const signup of event.signups) {
    const isPresent = signup.attendanceSessions.some((s) => s.leftAt === null);
    const totalMinutes = signup.attendanceSessions.reduce(
      (sum, s) => sum + sessionMinutes(s.arrivedAt, s.leftAt),
      0
    );
    rows.push([
      signup.user.name,
      signup.user.email,
      isPresent ? "Présent" : "Absent",
      String(signup.attendanceSessions.length),
      Math.round(totalMinutes).toString(),
    ]);
  }

  const csv =
    "﻿" + rows.map((row) => row.map(csvEscape).join(";")).join("\r\n");

  const filename = `presences-${event.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
