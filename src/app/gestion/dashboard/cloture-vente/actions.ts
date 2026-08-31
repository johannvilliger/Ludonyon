"use server";

import { genererPdfClotureVendeurs } from "@/lib/bilan-vendeurs-pdf";
import { dashboardEstConnecte } from "@/lib/gestion";

export async function telechargerPdfClotureVendeurs(
  editionId: string,
): Promise<{ base64: string; nomFichier: string }> {
  if (!(await dashboardEstConnecte())) throw new Error("Non autorisé.");
  return genererPdfClotureVendeurs(editionId);
}
