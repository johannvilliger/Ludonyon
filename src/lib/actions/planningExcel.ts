"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { requireOrganisationUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getLeafSlots, type Periode, type Site } from "@/lib/planning";
import { computeVolunteerDisplayNames, buildVolunteerNameLookup } from "@/lib/volunteerNames";

export type ImportPlanningExcelState = { error?: string; success?: string };

const DATE_TEXT_RE = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/;

function parseRowDate(value: ExcelJS.CellValue): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const match = DATE_TEXT_RE.exec(value.trim());
    if (match) {
      const [, d, m, y] = match;
      return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    }
  }
  return null;
}

// Importe un planning rempli depuis le modèle Excel généré par
// "Générer le modèle" : une ligne par semaine (colonne 1 = lundi), une
// colonne par créneau de la grille (même ordre que getLeafSlots()). Une
// case vide efface l'assignation existante pour ce créneau ; une case
// remplie remplace la liste des bénévoles par celle reconnue dans le
// texte (prénoms séparés par virgule/point-virgule/retour à la ligne).
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
  let rowsRead = 0;

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber < 3) return; // lignes 1-2 = en-têtes
    const monday = parseRowDate(row.getCell(1).value);
    if (!monday) return;
    rowsRead++;

    leaves.forEach((leaf, i) => {
      const cellValue = row.getCell(i + 2).value;
      const text =
        typeof cellValue === "string" ? cellValue : cellValue != null ? String(cellValue) : "";
      // "—" = jour hors période demandée au moment de la génération du
      // modèle (voir CLOSED_FILL côté export) : on n'y touche pas du tout,
      // à la différence d'une case réellement laissée vide (voir plus bas).
      if (text.trim() === "—") return;

      const date = new Date(monday);
      date.setUTCDate(date.getUTCDate() + leaf.offset);

      const names = text
        .split(/[,;\n]+/)
        .map((n) => n.trim())
        .filter(Boolean);

      const userIds: string[] = [];
      for (const name of names) {
        const id = lookup.get(name.toLowerCase());
        if (id) {
          userIds.push(id);
        } else {
          unmatchedNames.add(name);
        }
      }

      // Une case vide (userIds vide, aucun nom non reconnu) efface
      // l'assignation existante — voir plus bas.
      parsedShifts.push({ date, site: leaf.site, periode: leaf.periode, userIds });
    });
  });

  if (rowsRead === 0) {
    return {
      error:
        "Aucune ligne reconnue dans le fichier. Utilisez le modèle généré par « Générer le modèle » sans modifier la mise en page.",
    };
  }

  let shiftsTouched = 0;
  for (const parsed of parsedShifts) {
    const existing = await prisma.openingShift.findUnique({
      where: { date_site_periode: { date: parsed.date, site: parsed.site, periode: parsed.periode } },
    });

    if (parsed.userIds.length === 0) {
      // Case laissée vide dans le fichier = pas de bénévole sur ce créneau.
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
