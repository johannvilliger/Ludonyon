"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { requireOrganisationUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { EXCEL_FONCTIONS, getLeafSlots, type Periode, type Site } from "@/lib/planning";
import { computeVolunteerDisplayNames, buildVolunteerNameLookup } from "@/lib/volunteerNames";

export type ImportPlanningExcelState = { error?: string; success?: string };

const FONCTION_COUNT = EXCEL_FONCTIONS.length;
const ROWS_PER_WEEK = 1 + FONCTION_COUNT; // 1 ligne date + 4 lignes fonction

// Importe un planning rempli depuis le modèle Excel généré par
// "Générer le modèle" : un bloc de ROWS_PER_WEEK lignes par semaine (une
// ligne d'en-tête avec la date exacte de chaque jour, suivie d'une ligne
// par fonction — voir EXCEL_FONCTIONS), et une colonne par créneau de la
// grille (même ordre que getLeafSlots()). Les fonctions sont purement
// organisationnelles côté fichier : tous les noms saisis sous un même jour
// sont fusionnés dans une seule liste d'assignation, quelle que soit la
// ligne fonction où ils ont été tapés. Un jour entièrement vide efface
// l'assignation existante ; un jour marqué "—" (hors période au moment de
// la génération du modèle) reste intouché.
export async function importPlanningExcel(
  _prevState: ImportPlanningExcelState,
  formData: FormData
): Promise<ImportPlanningExcelState> {
  await requireOrganisationUser();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choisissez un fichier Excel (.xlsx) à importer." };
  }

  // Deux versions de @types/node coexistent dans les dépendances (une plus
  // récente bundlée par @prisma/adapter-mariadb), ce qui rend leurs types
  // Buffer structurellement incompatibles pour tsc malgré une forme
  // identique à l'exécution — d'où le passage par `any` ici.
  const buffer: unknown = Buffer.from(await file.arrayBuffer());
  const workbook = new ExcelJS.Workbook();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(buffer as any);
  } catch {
    return { error: "Fichier Excel illisible. Réexportez le modèle et réessayez." };
  }

  const sheet = workbook.getWorksheet("Planning");
  if (!sheet) {
    return { error: "Feuille « Planning » introuvable — utilisez le modèle généré par le site." };
  }

  const leaves = getLeafSlots();
  const activeUsers = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true },
  });
  const lookup = buildVolunteerNameLookup(computeVolunteerDisplayNames(activeUsers));

  type ParsedShift = { date: Date; site: Site; periode: Periode; userIds: string[] };
  const parsedShifts: ParsedShift[] = [];
  const unmatchedNames = new Set<string>();
  let weekBlocksRead = 0;

  const lastRow = sheet.lastRow?.number ?? 0;
  let rowIndex = 2; // ligne 1 = bandeau "Ouvertures Nyon/Gland"

  while (rowIndex <= lastRow) {
    const headerRow = sheet.getRow(rowIndex);
    const hasAnyDate = leaves.some(
      (_, i) => headerRow.getCell(i + 2).value instanceof Date
    );
    if (!hasAnyDate) break; // fin des blocs de semaine (ligne de légende ou vide)
    weekBlocksRead++;

    leaves.forEach((leaf, i) => {
      const col = i + 2;
      const headerValue = headerRow.getCell(col).value;
      if (!(headerValue instanceof Date)) return; // "—" : hors période, on n'y touche pas

      const userIds: string[] = [];
      for (let f = 0; f < FONCTION_COUNT; f++) {
        const cellValue = sheet.getRow(rowIndex + 1 + f).getCell(col).value;
        const text =
          typeof cellValue === "string" ? cellValue : cellValue != null ? String(cellValue) : "";
        const trimmed = text.trim();
        if (!trimmed || trimmed === "—") continue;

        const names = trimmed
          .split(/[,;\n]+/)
          .map((n) => n.trim())
          .filter(Boolean);
        for (const name of names) {
          const id = lookup.get(name.toLowerCase());
          if (id) {
            if (!userIds.includes(id)) userIds.push(id);
          } else {
            unmatchedNames.add(name);
          }
        }
      }

      // Un jour entièrement vide (userIds vide, aucun nom non reconnu)
      // efface l'assignation existante — voir plus bas.
      parsedShifts.push({ date: headerValue, site: leaf.site, periode: leaf.periode, userIds });
    });

    rowIndex += ROWS_PER_WEEK;
  }

  if (weekBlocksRead === 0) {
    return {
      error:
        "Aucune semaine reconnue dans le fichier. Utilisez le modèle généré par « Générer le modèle » sans modifier la mise en page.",
    };
  }

  let shiftsTouched = 0;
  for (const parsed of parsedShifts) {
    const existing = await prisma.openingShift.findUnique({
      where: { date_site_periode: { date: parsed.date, site: parsed.site, periode: parsed.periode } },
    });

    if (parsed.userIds.length === 0) {
      // Jour laissé vide dans le fichier = pas de bénévole sur ce créneau.
      if (existing) {
        await prisma.openingShiftAssignee.deleteMany({ where: { shiftId: existing.id } });
        await prisma.openingShift.delete({ where: { id: existing.id } });
        shiftsTouched++;
      }
      continue;
    }

    const shift =
      existing ??
      (await prisma.openingShift.create({
        data: { date: parsed.date, site: parsed.site, periode: parsed.periode },
      }));

    await prisma.openingShiftAssignee.deleteMany({
      where: { shiftId: shift.id, userId: { notIn: parsed.userIds } },
    });
    for (const userId of parsed.userIds) {
      await prisma.openingShiftAssignee.upsert({
        where: { shiftId_userId: { shiftId: shift.id, userId } },
        create: { shiftId: shift.id, userId },
        update: {},
      });
    }
    shiftsTouched++;
  }

  revalidatePath("/planning");
  revalidatePath("/organisation/planning");

  const parts = [`${shiftsTouched} créneau${shiftsTouched > 1 ? "x" : ""} mis à jour.`];
  if (unmatchedNames.size > 0) {
    parts.push(
      `${unmatchedNames.size} nom(s) non reconnu(s) (vérifiez l'orthographe / l'onglet « Bénévoles ») : ${[
        ...unmatchedNames,
      ].join(", ")}.`
    );
  }

  return { success: parts.join(" ") };
}
