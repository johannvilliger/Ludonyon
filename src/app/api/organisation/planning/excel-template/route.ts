import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { requireOrganisationUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  EXCEL_FONCTIONS,
  getLeafSlots,
  getPlanningWeeksBetween,
  parseDateKey,
} from "@/lib/planning";
import { computeVolunteerDisplayNames } from "@/lib/volunteerNames";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const FONCTION_COUNT = EXCEL_FONCTIONS.length;

const NYON_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFDCEBFC" },
};
const GLAND_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFCF0D0" },
};
const CLOSED_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFEEEEEE" },
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
  const totalCols = 1 + leaves.length * FONCTION_COUNT;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Ludonyon";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Planning");
  sheet.views = [{ state: "frozen", ySplit: 3, xSplit: 1 }];

  // Colonne 1 : date du lundi de la semaine. Puis, pour chaque créneau
  // (Nyon puis Gland, voir getLeafSlots()), un bloc de FONCTION_COUNT
  // colonnes — une case par fonction, purement organisationnelle : voir
  // EXCEL_FONCTIONS.
  sheet.getColumn(1).width = 16;
  for (let col = 2; col <= totalCols; col++) {
    sheet.getColumn(col).width = 16;
  }

  const headerRow1 = sheet.getRow(1);
  sheet.mergeCells(1, 1, 3, 1);
  headerRow1.getCell(1).value = "Semaine du";
  sheet.mergeCells(1, 2, 1, 1 + nyonCount * FONCTION_COUNT);
  headerRow1.getCell(2).value = "Nyon";
  sheet.mergeCells(1, 2 + nyonCount * FONCTION_COUNT, 1, totalCols);
  headerRow1.getCell(2 + nyonCount * FONCTION_COUNT).value = "Gland";

  for (let i = 0; i < leaves.length; i++) {
    const blockStart = 2 + i * FONCTION_COUNT;
    const fill = i < nyonCount ? NYON_FILL : GLAND_FILL;

    sheet.mergeCells(2, blockStart, 2, blockStart + FONCTION_COUNT - 1);
    const dayCell = sheet.getRow(2).getCell(blockStart);
    dayCell.value = `${leaves[i].groupLabel}\n${leaves[i].hours}`;
    dayCell.fill = fill;
    dayCell.font = { bold: true, size: 10 };
    dayCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

    EXCEL_FONCTIONS.forEach((fonction, f) => {
      const c = sheet.getRow(3).getCell(blockStart + f);
      c.value = fonction;
      c.fill = fill;
      c.font = { bold: true, size: 9 };
      c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    });
  }
  for (let col = 2; col <= totalCols; col++) {
    headerRow1.getCell(col).fill = col < 2 + nyonCount * FONCTION_COUNT ? NYON_FILL : GLAND_FILL;
    headerRow1.getCell(col).font = { bold: true };
    headerRow1.getCell(col).alignment = { horizontal: "center", vertical: "middle" };
  }
  const c1Header = headerRow1.getCell(1);
  c1Header.font = { bold: true };
  c1Header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F5F4" } };
  c1Header.alignment = { horizontal: "center", vertical: "middle" };

  let rowIndex = 4;
  for (const week of weeks) {
    const row = sheet.getRow(rowIndex);
    const dateCell = row.getCell(1);
    // Normalisé en minuit UTC (comme les colonnes DATE stockées en base,
    // voir parseDateKey) : week.monday est un Date en heure locale
    // (Europe/Zurich), et un simple .value = week.monday ferait dériver le
    // sérial Excel d'un jour selon l'heure d'été/hiver au moment de la
    // conversion, décalant toutes les dates relues à l'import.
    dateCell.value = new Date(
      Date.UTC(week.monday.getFullYear(), week.monday.getMonth(), week.monday.getDate())
    );
    dateCell.numFmt = "dd/mm/yyyy";
    dateCell.font = { bold: true };
    dateCell.alignment = { vertical: "middle" };

    week.cells.forEach((cell, i) => {
      const blockStart = 2 + i * FONCTION_COUNT;
      for (let f = 0; f < FONCTION_COUNT; f++) {
        const c = row.getCell(blockStart + f);
        c.alignment = { wrapText: true, vertical: "top" };
        c.border = {
          top: { style: "thin", color: { argb: "FFE7E5E4" } },
          left: { style: "thin", color: { argb: "FFE7E5E4" } },
          right: { style: "thin", color: { argb: "FFE7E5E4" } },
          bottom: { style: "thin", color: { argb: "FFE7E5E4" } },
        };
        if (!cell.inMonth) {
          c.value = "—";
          c.fill = CLOSED_FILL;
          c.font = { italic: true, color: { argb: "FFA8A29E" } };
        }
      }
    });
    rowIndex++;
  }

  const legendRow = sheet.getRow(rowIndex + 1);
  legendRow.getCell(1).value =
    "Une case par fonction, pour vous aider à répartir les tâches — à l'import, tout le monde est simplement ajouté·e à l'ouverture du jour, quelle que soit la fonction utilisée. Plusieurs bénévoles sur une même case : séparez les prénoms par une virgule. Utilisez exactement les noms de l'onglet « Bénévoles ».";
  legendRow.getCell(1).font = { italic: true, size: 10, color: { argb: "FF78716C" } };
  legendRow.alignment = { wrapText: true };
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
