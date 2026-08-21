"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrganisationUser, requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isOrganisationRole } from "@/lib/roles";
import { sendPushToUsers } from "@/lib/push";
import { POSTES, canCoverPoste, isValidPoste, type Poste } from "@/lib/postes";
import type { Prisma } from "@/generated/prisma/client";
import {
  PLANNING_COLUMNS,
  SITE_LABELS,
  formatDayLabel,
  shiftSlotKey,
  type Periode,
  type Site,
} from "@/lib/planning";

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
  revalidatePath("/organisation/planning");
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
  revalidatePath("/organisation/planning");
}

// ---------- Recherche de remplaçant ----------

export async function requestReplacement(formData: FormData) {
  const user = await requireUser();
  const shiftId = String(formData.get("shiftId") ?? "");
  const sendNotification = formData.get("sendNotification") === "on";

  const assignee = await prisma.openingShiftAssignee.findUnique({
    where: { shiftId_userId: { shiftId, userId: user.id } },
    include: { shift: true },
  });
  if (!assignee) {
    throw new Error("Vous n'êtes pas assigné·e à ce créneau");
  }

  await prisma.openingShiftAssignee.update({
    where: { id: assignee.id },
    data: {
      seekingReplacement: true,
      replacementRequestedAt: new Date(),
      problemAlertSentAt: null,
    },
  });

  if (sendNotification) {
    const site = assignee.shift.site as Site;
    const periode = assignee.shift.periode as Periode;
    const key = shiftSlotKey(site, periode);
    if (key) {
      const requester = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { role: true, poste: true },
      });

      // Un·e bénévole n'est proposé·e qu'à d'autres bénévoles (filtrés par
      // la hiérarchie de poste s'il en a un) ; un·e responsable ou membre
      // du comité n'est proposé·e qu'aux autres personnes du même rôle,
      // sans filtre de poste (ça ne les concerne pas).
      let roleFilter: Prisma.UserWhereInput;
      if (requester.role === "BENEVOLE") {
        roleFilter = { role: "BENEVOLE" };
        if (requester.poste && isValidPoste(requester.poste)) {
          const requesterPoste = requester.poste;
          const coveringPostes = POSTES.filter((p) =>
            canCoverPoste(p, requesterPoste as Poste)
          );
          roleFilter = { ...roleFilter, poste: { in: coveringPostes } };
        }
      } else {
        roleFilter = { role: requester.role };
      }

      const candidates = await prisma.user.findMany({
        where: {
          active: true,
          id: { not: user.id },
          availabilities: { some: { slotKey: key } },
          // Exclut les bénévoles en vacances déclarées ce jour-là.
          vacations: {
            none: {
              startDate: { lte: assignee.shift.date },
              endDate: { gte: assignee.shift.date },
            },
          },
          ...roleFilter,
        },
        select: { id: true },
      });

      if (candidates.length > 0) {
        const title = "Remplaçant·e recherché·e";
        const body = `${user.name} ne peut pas assurer son créneau du ${formatDayLabel(
          assignee.shift.date
        )} à ${SITE_LABELS[site]}. Disponible ?`;

        await sendPushToUsers(
          candidates.map((c) => c.id),
          { title, body, url: "/planning" }
        );
        await prisma.pushNotificationLog.create({
          data: {
            category: "REPLACEMENT_REQUEST",
            title,
            body,
            recipients: candidates.length,
          },
        });
      }
    }
  }

  revalidatePath("/planning");
  revalidatePath("/organisation/planning");
}

export async function cancelReplacementRequest(formData: FormData) {
  const user = await requireUser();
  const shiftId = String(formData.get("shiftId") ?? "");
  const targetUserId = String(formData.get("userId") ?? user.id);

  if (targetUserId !== user.id && !isOrganisationRole(user.role)) {
    throw new Error("Action non autorisée");
  }

  await prisma.openingShiftAssignee.updateMany({
    where: { shiftId, userId: targetUserId },
    data: {
      seekingReplacement: false,
      replacementRequestedAt: null,
      problemAlertSentAt: null,
    },
  });

  revalidatePath("/planning");
  revalidatePath("/organisation/planning");
}
