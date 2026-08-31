import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { requireOrganisationUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  EXCEL_FONCTIONS,
  excelLeafColumn,
  getLeafSlots,
  getPlanningWeeksBetween,
  parseDateKey,
} from "@/lib/planning";
import { computeVolunteerDisplayNames } from "@/lib/volunteerNames";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const FONCTION_COUNT = EXCEL_FONCTIONS.length;
const ROWS_PER_WEEK = 1 + FONCTION_COUNT; // 1 ligne date + 4 lignes fonction

// Une couleur par mois (ligne d'en-tête de date uniquement) : change dès
// que le mois du lundi de la semaine change, pour regrouper visuellement
// les semaines d'un même mois plutôt que d'alterner à chaque ligne.
const MONTH_BAND_FILLS: ExcelJS.Fill[] = [
  { type: "pattern", pattern: "solid", fgColor: { argb: "FFFBD98A" } },
  { type: "pattern", pattern: "solid", fgColor: { argb: "FFC9C2F0" } },
  { type: "pattern", pattern: "solid", fgColor: { argb: "FFB8E8CC" } },
];
const CLOSED_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFEEEEEE" },
};
const LABEL_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF5F5F4" },
};

export async function GET(request: Request) {
  await requireOrganisationUser();

  const url = new URL(request.url);
  const startParam = url.searchParams.get("start") ?? "";
  const endParam = url.searchParams.get("end") ?? "";
  if (!DATE_RE.test(startParam) || !DATE_RE.test(endParam)) {
    return NextResponse.json({ error: "Dates invalides" }, { status: 400 });
  }

  const start = parseDateKey(startParam);
  const end = parseDateKey(endParam);
  if (end.getTime() < start.getTime()) {
    return NextResponse.json(
      { error: "La date de fin doit être après la date de début" },
      { status: 400 }
    );
  }

  const activeUsers = await prisma.user.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const displayNames = computeVolunteerDisplayNames(activeUsers);

  const leaves = getLeafSlots();
  const nyonCount = leaves.filter((l) => l.site === "NYON").length;
  const weeks = getPlanningWeeksBetween(start, end);
  // +1 pour la colonne vide de séparation entre les blocs Nyon et Gland.
  const totalCols = 1 + leaves.length + 1;
  const spacerCol = 1 + nyonCount + 1;
  const glandStartCol = spacerCol + 1;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Ludonyon";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Planning");
  sheet.views = [{ state: "frozen", xSplit: 1, ySplit: 1 }];

  // Colonne 1 : libellé de fonction (répété pour chaque semaine, sert à la
  // fois pour le bloc Nyon et le bloc Gland puisqu'ils partagent les mêmes
  // lignes). Colonnes 2..N : un jour d'ouverture par colonne (Nyon puis
  // Gland, même ordre que getLeafSlots()), avec une colonne étroite vide
  // entre les deux blocs pour les séparer visuellement.
  sheet.getColumn(1).width = 15;
  for (let col = 2; col <= totalCols; col++) {
    sheet.getColumn(col).width = col === spacerCol ? 3 : 20;
  }

  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  const yearLabel = startYear === endYear ? String(startYear) : `${startYear}–${endYear}`;

  const bannerRow = sheet.getRow(1);
  sheet.mergeCells(1, 2, 1, nyonCount + 1);
  const nyonBanner = bannerRow.getCell(2);
  nyonBanner.value = `Ouvertures Nyon ${yearLabel}`;
  nyonBanner.font = { bold: true, size: 13 };
  nyonBanner.alignment = { horizontal: "center", vertical: "middle" };

  sheet.mergeCells(1, glandStartCol, 1, totalCols);
  const glandBanner = bannerRow.getCell(glandStartCol);
  glandBanner.value = `Ouvertures Gland ${yearLabel}`;
  glandBanner.font = { bold: true, size: 13 };
  glandBanner.alignment = { horizontal: "center", vertical: "middle" };
  bannerRow.height = 22;

  let rowIndex = 2;
  let monthColorIndex = 0;
  let lastMonthKey: string | null = null;

  weeks.forEach((week) => {
    const monthKey = `${week.monday.getFullYear()}-${week.monday.getMonth()}`;
    if (lastMonthKey !== null && monthKey !== lastMonthKey) {
      monthColorIndex = (monthColorIndex + 1) % MONTH_BAND_FILLS.length;
    }
    lastMonthKey = monthKey;
    const band = MONTH_BAND_FILLS[monthColorIndex];

    const headerRow = sheet.getRow(rowIndex);

    leaves.forEach((leaf, i) => {
      const col = excelLeafColumn(i, nyonCount);
      const cell = headerRow.getCell(col);
      const cellDate = week.cells[i].date;
      const inRange = week.cells[i].inMonth;

      if (inRange) {
        // Vraie date Excel (minuit UTC, comme les colonnes DATE en base —
        // voir parseDateKey) affichée en "jour date mois" : c'est aussi
        // cette valeur qui est relue telle quelle à l'import, donc aucun
        // recalcul lundi+décalage n'est nécessaire côté import.
        cell.value = new Date(
          Date.UTC(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate())
        );
        cell.numFmt = "dddd d mmmm";
        cell.fill = band;
      } else {
        cell.value = "—";
        cell.fill = CLOSED_FILL;
        cell.font = { italic: true, color: { argb: "FFA8A29E" } };
      }
      cell.font = { ...cell.font, bold: inRange };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });
    headerRow.height = 18;

    EXCEL_FONCTIONS.forEach((fonction, f) => {
      const dataRow = sheet.getRow(rowIndex + 1 + f);
      const labelCell = dataRow.getCell(1);
      labelCell.value = fonction;
      labelCell.font = { bold: true, size: 10 };
      labelCell.fill = LABEL_FILL;
      labelCell.alignment = { vertical: "middle" };

      leaves.forEach((leaf, i) => {
        const col = excelLeafColumn(i, nyonCount);
        const cell = dataRow.getCell(col);
        const inRange = week.cells[i].inMonth;
        cell.border = {
          top: { style: "thin", color: { argb: "FFE7E5E4" } },
          left: { style: "thin", color: { argb: "FFE7E5E4" } },
          right: { style: "thin", color: { argb: "FFE7E5E4" } },
          bottom: { style: "thin", color: { argb: "FFE7E5E4" } },
        };
        if (!inRange) {
          cell.value = "—";
          cell.fill = CLOSED_FILL;
          cell.font = { italic: true, color: { argb: "FFA8A29E" } };
        }
      });
    });

    rowIndex += ROWS_PER_WEEK;
  });

  const legendRow = sheet.getRow(rowIndex + 1);
  legendRow.getCell(1).value =
    "Une ligne par fonction : la fonction utilisée pour chaque nom est conservée et affichée sur le planning à l'import. Plusieurs bénévoles sur une même case : séparez les prénoms par une virgule. Utilisez exactement les noms de l'onglet « Bénévoles ».";
  legendRow.getCell(1).font = { italic: true, size: 10, color: { argb: "FF78716C" } };
  legendRow.getCell(1).alignment = { wrapText: true };
  sheet.mergeCells(legendRow.number, 1, legendRow.number, totalCols);

  const legendSheet = workbook.addWorksheet("Bénévoles");
  legendSheet.getColumn(1).width = 28;
  legendSheet.getRow(1).getCell(1).value = "Prénom à utiliser dans le planning";
  legendSheet.getRow(1).getCell(1).font = { bold: true };
  displayNames.forEach((entry, i) => {
    legendSheet.getRow(i + 2).getCell(1).value = entry.displayName;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `planning-a-remplir_${startParam}_${endParam}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
