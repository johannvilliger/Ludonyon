"use server";

import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requireOrganisationUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { mailConfigured } from "@/lib/mail";
import { getAvailabilityOptions } from "@/lib/planning";
import { POSTE_LABELS } from "@/lib/postes";
import { parseVolunteerImportText, type ParsedVolunteerRow } from "@/lib/volunteerImport";
import { sendWelcomeEmail } from "@/lib/actions/organisation";

const SLOT_LABELS = new Map(getAvailabilityOptions().map((o) => [o.slotKey, o.label]));

export interface VolunteerImportPreviewRow {
  line: number;
  name: string;
  email: string;
  phone: string;
  posteLabel: string | null;
  proposeResponsable: boolean;
  slotLabels: string[];
  warnings: string[];
  status: "new" | "update" | "duplicate";
  existingName?: string;
  nameChanged?: boolean;
  phoneChanged?: boolean;
  roleWillChange?: boolean;
  posteWillChange?: boolean;
}

export interface VolunteerImportPreviewState {
  pasted?: string;
  rows?: VolunteerImportPreviewRow[];
  error?: string;
}

function randomPassword(): string {
  return randomBytes(9).toString("base64url");
}

export async function previewVolunteerImport(
  _prevState: VolunteerImportPreviewState,
  formData: FormData
): Promise<VolunteerImportPreviewState> {
  await requireOrganisationUser();

  const pasted = String(formData.get("pasted") ?? "");
  const parsedRows = parseVolunteerImportText(pasted);
  if (parsedRows.length === 0) {
    return { pasted, error: "Aucune ligne exploitable trouvée (vérifiez que l'email est bien dans la 4e colonne)." };
  }

  const emails = parsedRows.map((r) => r.email);
  const existingUsers = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { email: true, name: true, phone: true, role: true, poste: true },
  });
  const existingByEmail = new Map(existingUsers.map((u) => [u.email, u]));

  const seenEmails = new Set<string>();
  const rows: VolunteerImportPreviewRow[] = [];

  for (const r of parsedRows) {
    if (seenEmails.has(r.email)) {
      rows.push({
        line: r.line,
        name: r.name,
        email: r.email,
        phone: r.phone,
        posteLabel: r.poste ? POSTE_LABELS[r.poste] : null,
        proposeResponsable: r.proposeResponsable,
        slotLabels: r.slotKeys.map((k) => SLOT_LABELS.get(k) ?? k),
        warnings: ["email en double dans le collage : cette ligne sera ignorée"],
        status: "duplicate",
      });
      continue;
    }
    seenEmails.add(r.email);

    const existing = existingByEmail.get(r.email);
    rows.push({
      line: r.line,
      name: r.name,
      email: r.email,
      phone: r.phone,
      posteLabel: r.poste ? POSTE_LABELS[r.poste] : null,
      proposeResponsable: r.proposeResponsable,
      slotLabels: r.slotKeys.map((k) => SLOT_LABELS.get(k) ?? k),
      warnings: r.warnings,
      status: existing ? "update" : "new",
      existingName: existing?.name,
      nameChanged: !!existing && existing.name !== r.name,
      phoneChanged: !!existing && !!r.phone && existing.phone !== r.phone,
      roleWillChange: !!existing && r.proposeResponsable && existing.role === "BENEVOLE",
      posteWillChange: !!existing && !!r.poste && existing.poste !== r.poste,
    });
  }

  return { pasted, rows };
}

export interface VolunteerImportApplyState {
  summary?: { created: number; updated: number; skipped: number; emailsSent: number };
  error?: string;
}

async function applyRow(
  row: ParsedVolunteerRow,
  sendEmails: boolean
): Promise<"created" | "updated" | "emailSent" | null> {
  const existing = await prisma.user.findUnique({ where: { email: row.email } });

  if (existing) {
    const role = row.proposeResponsable && existing.role === "BENEVOLE" ? "RESPONSABLE" : existing.role;
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: row.name,
        phone: row.phone || existing.phone,
        role,
        poste: row.poste ?? existing.poste,
      },
    });
    if (row.slotKeys.length > 0) {
      const already = await prisma.volunteerAvailability.findMany({
        where: { userId: existing.id },
        select: { slotKey: true },
      });
      const alreadySet = new Set(already.map((a) => a.slotKey));
      const toAdd = row.slotKeys.filter((k) => !alreadySet.has(k));
      if (toAdd.length > 0) {
        await prisma.volunteerAvailability.createMany({
          data: toAdd.map((slotKey) => ({ userId: existing.id, slotKey })),
        });
      }
    }
    return "updated";
  }

  const password = randomPassword();
  const passwordHash = await bcrypt.hash(password, 10);
  const created = await prisma.user.create({
    data: {
      name: row.name,
      email: row.email,
      phone: row.phone || null,
      role: row.proposeResponsable ? "RESPONSABLE" : "BENEVOLE",
      poste: row.poste,
      passwordHash,
      availabilities: { create: row.slotKeys.map((slotKey) => ({ slotKey })) },
    },
  });

  if (sendEmails && mailConfigured()) {
    try {
      await sendWelcomeEmail(created.name, created.email, password);
      return "emailSent";
    } catch (err) {
      console.error("Échec de l'envoi de l'email de bienvenue (import groupé) :", err);
    }
  }
  return "created";
}

export async function applyVolunteerImport(
  _prevState: VolunteerImportApplyState,
  formData: FormData
): Promise<VolunteerImportApplyState> {
  await requireOrganisationUser();

  const pasted = String(formData.get("pasted") ?? "");
  const sendEmails = formData.get("sendEmails") === "on";
  const parsedRows = parseVolunteerImportText(pasted);
  if (parsedRows.length === 0) {
    return { error: "Aucune ligne exploitable trouvée." };
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let emailsSent = 0;
  const seenEmails = new Set<string>();

  for (const row of parsedRows) {
    if (seenEmails.has(row.email)) {
      skipped++;
      continue;
    }
    seenEmails.add(row.email);

    const result = await applyRow(row, sendEmails);
    if (result === "updated") updated++;
    else if (result === "created") created++;
    else if (result === "emailSent") {
      created++;
      emailsSent++;
    }
  }

  revalidatePath("/annuaire");
  revalidatePath("/organisation/benevoles");

  return { summary: { created, updated, skipped, emailsSent } };
}
