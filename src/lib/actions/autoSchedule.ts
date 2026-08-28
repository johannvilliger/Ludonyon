"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrganisationUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getPlanningWeeks, PLANNING_COLUMNS, parseDateKey, type Periode, type Site } from "@/lib/planning";
import { computeAutoScheduleForMonth } from "@/lib/autoSchedule";

// Applique au planning réel la proposition de répartition automatique
// (recalculée ici plutôt que reçue du client, pour ne pas faire confiance
// à des données soumises) : efface d'abord tout le planning existant du
// mois (cohérent avec la génération, qui repart toujours de zéro), puis
// recrée les créneaux/assignations d'après la proposition — corrections
// manuelles (voir plus bas) comprises.
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

// ---------- Corrections manuelles de la proposition ----------

const SITES: Site[] = ["NYON", "GLAND"];
const PERIODES: Periode[] = ["JOURNEE", "MATIN", "APREM"];

const overrideShiftSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide"),
  site: z.enum(SITES as [Site, ...Site[]]),
  periode: z.enum(PERIODES as [Periode, ...Periode[]]),
  userId: z.string().min(1, "Bénévole requis"),
});

// Vérifie que la combinaison (site, période) fait bien partie de la grille
// hebdomadaire fixe, pour éviter de créer un créneau hors planning via une
// requête forgée.
function isKnownSlot(site: Site, periode: Periode): boolean {
  return PLANNING_COLUMNS.some((column) =>
    column.slots.some((slot) => slot.site === site && slot.periode === periode)
  );
}

// Recalcule la proposition actuelle (algorithme + corrections déjà
// appliquées) pour retrouver qui est actuellement assigné·e à un créneau
// donné — sert de base à l'ajout/retrait ci-dessous, pour ne jamais
// perdre une correction précédente en écrasant tout le siège. Année/mois
// sont dérivés de la date du créneau (pas besoin de champs séparés dans
// le formulaire).
async function currentAssigneeIds(date: string, site: Site, periode: Periode): Promise<string[]> {
  const [year, month] = date.split("-").map(Number);
  const { shifts } = await computeAutoScheduleForMonth(year, month);
  const shift = shifts.find((s) => s.dateKeyStr === date && s.site === site && s.periode === periode);
  return shift ? shift.assignees.map((a) => a.userId) : [];
}

async function saveOverride(date: string, site: Site, periode: Periode, userIds: string[]) {
  await prisma.autoScheduleOverride.upsert({
    where: { date_site_periode: { date: parseDateKey(date), site, periode } },
    create: { date: parseDateKey(date), site, periode, userIds: userIds.join(",") },
    update: { userIds: userIds.join(",") },
  });
  revalidatePath("/organisation/planning/auto");
}

export async function addAutoScheduleOverrideUser(formData: FormData) {
  await requireOrganisationUser();

  const parsed = overrideShiftSchema.safeParse({
    date: formData.get("date"),
    site: formData.get("site"),
    periode: formData.get("periode"),
    userId: formData.get("userId"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Données invalides");
  }
  const { date, site, periode, userId } = parsed.data;
  if (!isKnownSlot(site, periode)) {
    throw new Error("Ce créneau ne fait pas partie de la grille d'ouverture");
  }

  const volunteer = await prisma.user.findUnique({ where: { id: userId } });
  if (!volunteer || !volunteer.active) {
    throw new Error("Bénévole introuvable ou archivé");
  }

  const currentIds = await currentAssigneeIds(date, site, periode);
  if (currentIds.includes(userId)) return;

  await saveOverride(date, site, periode, [...currentIds, userId]);
}

const removeSchema = overrideShiftSchema;

export async function removeAutoScheduleOverrideUser(formData: FormData) {
  await requireOrganisationUser();

  const parsed = removeSchema.safeParse({
    date: formData.get("date"),
    site: formData.get("site"),
    periode: formData.get("periode"),
    userId: formData.get("userId"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Données invalides");
  }
  const { date, site, periode, userId } = parsed.data;

  const currentIds = await currentAssigneeIds(date, site, periode);
  await saveOverride(
    date,
    site,
    periode,
    currentIds.filter((id) => id !== userId)
  );
}

const resetSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

// "Réinitialiser" : supprime toutes les corrections manuelles du mois pour
// repartir de la proposition telle que calculée par l'algorithme.
export async function resetAutoScheduleOverrides(formData: FormData) {
  await requireOrganisationUser();

  const parsed = resetSchema.safeParse({
    year: formData.get("year"),
    month: formData.get("month"),
  });
  if (!parsed.success) {
    throw new Error("Mois invalide");
  }

  const weeks = getPlanningWeeks(parsed.data.year, parsed.data.month);
  const rangeStart = weeks[0].monday;
  const rangeEnd = new Date(weeks[weeks.length - 1].monday);
  rangeEnd.setDate(rangeEnd.getDate() + 7);

  await prisma.autoScheduleOverride.deleteMany({
    where: { date: { gte: rangeStart, lt: rangeEnd } },
  });

  revalidatePath("/organisation/planning/auto");
}
