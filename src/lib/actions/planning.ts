"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrganisationUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PLANNING_COLUMNS, type Periode, type Site } from "@/lib/planning";

const SITES: Site[] = ["NYON", "GLAND"];
const PERIODES: Periode[] = ["JOURNEE", "MATIN", "APREM"];

const shiftSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide"),
  site: z.enum(SITES as [Site, ...Site[]]),
  periode: z.enum(PERIODES as [Periode, ...Periode[]]),
});

function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

// Vérifie que la combinaison (site, période) fait bien partie de la grille
// hebdomadaire fixe, pour éviter de créer des créneaux hors planning via
// une requête forgée.
function isKnownSlot(site: Site, periode: Periode): boolean {
  return PLANNING_COLUMNS.some((column) =>
    column.slots.some((slot) => slot.site === site && slot.periode === periode)
  );
}

export async function assignToShift(formData: FormData) {
  await requireOrganisationUser();

  const parsed = shiftSchema.safeParse({
    date: formData.get("date"),
    site: formData.get("site"),
    periode: formData.get("periode"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Créneau invalide");
  }
  if (!isKnownSlot(parsed.data.site, parsed.data.periode)) {
    throw new Error("Ce créneau ne fait pas partie de la grille d'ouverture");
  }

  const userId = String(formData.get("userId") ?? "");
  const volunteer = await prisma.user.findUnique({ where: { id: userId } });
  if (!volunteer || !volunteer.active) {
    throw new Error("Bénévole introuvable ou archivé");
  }

  const shift = await prisma.openingShift.upsert({
    where: {
      date_site_periode: {
        date: parseDateKey(parsed.data.date),
        site: parsed.data.site,
        periode: parsed.data.periode,
      },
    },
    create: {
      date: parseDateKey(parsed.data.date),
      site: parsed.data.site,
      periode: parsed.data.periode,
    },
    update: {},
  });

  await prisma.openingShiftAssignee.upsert({
    where: { shiftId_userId: { shiftId: shift.id, userId } },
    create: { shiftId: shift.id, userId },
    update: {},
  });

  revalidatePath("/planning");
}

const removeSchema = z.object({
  shiftId: z.string().min(1),
  userId: z.string().min(1),
});

export async function removeFromShift(formData: FormData) {
  await requireOrganisationUser();

  const parsed = removeSchema.safeParse({
    shiftId: formData.get("shiftId"),
    userId: formData.get("userId"),
  });
  if (!parsed.success) {
    throw new Error("Assignation invalide");
  }

  await prisma.openingShiftAssignee.deleteMany({
    where: { shiftId: parsed.data.shiftId, userId: parsed.data.userId },
  });

  const remaining = await prisma.openingShiftAssignee.count({
    where: { shiftId: parsed.data.shiftId },
  });
  if (remaining === 0) {
    await prisma.openingShift.delete({ where: { id: parsed.data.shiftId } });
  }

  revalidatePath("/planning");
}
