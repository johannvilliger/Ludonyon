"use server";

import { revalidatePath } from "next/cache";
import { requireOrganisationUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getPlanningWeeks } from "@/lib/planning";
import { computeAutoScheduleForMonth } from "@/lib/autoSchedule";

// Applique au planning réel la proposition de répartition automatique
// (recalculée ici plutôt que reçue du client, pour ne pas faire confiance
// à des données soumises) : efface d'abord tout le planning existant du
// mois (cohérent avec la génération, qui repart toujours de zéro), puis
// recrée les créneaux/assignations d'après la proposition.
export async function applyAutoSchedule(formData: FormData) {
  await requireOrganisationUser();

  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  if (!year || !month || month < 1 || month > 12) {
    throw new Error("Mois invalide");
  }

  const { shifts } = await computeAutoScheduleForMonth(year, month);

  const weeks = getPlanningWeeks(year, month);
  const rangeStart = weeks[0].monday;
  const rangeEnd = new Date(weeks[weeks.length - 1].monday);
  rangeEnd.setDate(rangeEnd.getDate() + 7);

  await prisma.$transaction(async (tx) => {
    // onDelete: Cascade sur OpeningShiftAssignee supprime aussi les
    // assignations existantes du mois.
    await tx.openingShift.deleteMany({
      where: { date: { gte: rangeStart, lt: rangeEnd } },
    });

    for (const shift of shifts) {
      if (shift.assignees.length === 0) continue;
      const openingShift = await tx.openingShift.create({
        data: { date: shift.date, site: shift.site, periode: shift.periode },
      });
      await tx.openingShiftAssignee.createMany({
        data: shift.assignees.map((a) => ({ shiftId: openingShift.id, userId: a.userId })),
      });
    }
  });

  revalidatePath("/planning");
  revalidatePath("/organisation/planning");
  revalidatePath("/organisation/planning/auto");
}
