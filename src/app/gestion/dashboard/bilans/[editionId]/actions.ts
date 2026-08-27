"use server";

import { genererExcelBilan } from "@/lib/bilan-excel";
import { dashboardEstConnecte } from "@/lib/gestion";

export async function exporterExcelBilan(editionId: string): Promise<{ base64: string; nomFichier: string }> {
  if (!(await dashboardEstConnecte())) throw new Error("Non autorisé.");
  return genererExcelBilan(editionId);
}
