import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { requireOrganisationUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getLeafSlots, getPlanningWeeksBetween, parseDateKey } from "@/lib/planning";
import { computeVolunteerDisplayNames } from "@/lib/volunteerNames";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Ludonyon";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Planning");
  sheet.views = [{ state: "frozen", ySplit: 2, xSplit: 1 }];

  // Colonne 1 : date du lundi de la semaine. Colonnes 2..N : créneaux
  // (Nyon puis Gland), dans le même ordre que la grille affichée sur le
  // site — voir getLeafSlots().
  sheet.getColumn(1).width = 16;
  leaves.forEach((_, i) => {
    sheet.getColumn(i + 2).width = 24;
  });

  const headerRow1 = sheet.getRow(1);
  headerRow1.getCell(1).value = "";
  headerRow1.getCell(2).value = "Nyon";
  headerRow1.getCell(2 + nyonCount).value = "Gland";
  sheet.mergeCells(1, 1, 2, 1);
  sheet.mergeCells(1, 2, 1, 1 + nyonCount);
  sheet.mergeCells(1, 2 + nyonCount, 1, 1 + leaves.length);
  headerRow1.getCell(1).value = "Semaine du";

  for (let i = 0; i < leaves.length; i++) {
    const col = i + 2;
    const fill = i < nyonCount ? NYON_FILL : GLAND_FILL;
    const c1 = headerRow1.getCell(col);
    c1.fill = fill;
    c1.font = { bold: true };
    c1.alignment = { horizontal: "center", vertical: "middle" };

    const c2 = sheet.getRow(2).getCell(col);
    c2.value = `${leaves[i].groupLabel}\n${leaves[i].hours}`;
    c2.fill = fill;
    c2.font = { bold: true, size: 10 };
    c2.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  }
  const c1Header = headerRow1.getCell(1);
  c1Header.font = { bold: true };
  c1Header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F5F4" } };
  c1Header.alignment = { horizontal: "center", vertical: "middle" };

  let rowIndex = 3;
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
      const col = i + 2;
      const c = row.getCell(col);
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
    });
    rowIndex++;
  }

  const legendRow = sheet.getRow(rowIndex + 1);
  legendRow.getCell(1).value =
    "Plusieurs bénévoles sur un même créneau : séparez les prénoms par une virgule. Utilisez exactement les noms de l'onglet « Bénévoles ».";
  legendRow.getCell(1).font = { italic: true, size: 10, color: { argb: "FF78716C" } };
  sheet.mergeCells(legendRow.number, 1, legendRow.number, 1 + leaves.length);

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
