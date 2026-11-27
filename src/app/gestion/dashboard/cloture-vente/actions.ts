"use server";

import { genererPdfClotureVendeurs } from "@/lib/bilan-vendeurs-pdf";
import { queuerDocumentImpression } from "@/lib/documents-impression";
import { genererPdfEtiquettesCloture } from "@/lib/etiquettes-cloture-pdf";
import { dashboardEstConnecte } from "@/lib/gestion";

export async function telechargerPdfClotureVendeurs(
  editionId: string,
  plage?: { debut: number; fin: number },
): Promise<{ base64: string; nomFichier: string }> {
  if (!(await dashboardEstConnecte())) throw new Error("Non autorisé.");
  return genererPdfClotureVendeurs(editionId, plage);
}

export async function envoyerEtiquettesClotureImpression(
  editionId: string,
  plage?: { debut: number; fin: number },
): Promise<void> {
  if (!(await dashboardEstConnecte())) throw new Error("Non autorisé.");
  const { base64, nomFichier } = await genererPdfEtiquettesCloture(editionId, plage);
  await queuerDocumentImpression(nomFichier, base64);
}

export async function envoyerPdfClotureImpression(
  editionId: string,
  plage?: { debut: number; fin: number },
): Promise<void> {
  if (!(await dashboardEstConnecte())) throw new Error("Non autorisé.");
  const { base64, nomFichier } = await genererPdfClotureVendeurs(editionId, plage);
  await queuerDocumentImpression(nomFichier, base64);
}
