"use server";

import { nouvelId, query } from "@/lib/db";
import { genererPdfClotureVendeurs } from "@/lib/bilan-vendeurs-pdf";
import { genererPdfEtiquettesCloture } from "@/lib/etiquettes-cloture-pdf";
import { dashboardEstConnecte } from "@/lib/gestion";

export async function telechargerPdfClotureVendeurs(
  editionId: string,
): Promise<{ base64: string; nomFichier: string }> {
  if (!(await dashboardEstConnecte())) throw new Error("Non autorisé.");
  return genererPdfClotureVendeurs(editionId);
}

// Met un PDF déjà rendu en file d'attente print-agent (voir migration 0039)
// — contrairement aux étiquettes articles, rien n'est reconstruit côté
// print-agent, le PDF généré ici est envoyé tel quel à l'imprimante.
async function queuerDocumentImpression(nomFichier: string, base64: string): Promise<void> {
  await query("INSERT INTO documents_impression (id, nom_fichier, pdf_base64) VALUES (?, ?, ?)", [
    nouvelId(),
    nomFichier,
    base64,
  ]);
}

export async function envoyerEtiquettesClotureImpression(editionId: string): Promise<void> {
  if (!(await dashboardEstConnecte())) throw new Error("Non autorisé.");
  const { base64, nomFichier } = await genererPdfEtiquettesCloture(editionId);
  await queuerDocumentImpression(nomFichier, base64);
}

export async function envoyerPdfClotureImpression(editionId: string): Promise<void> {
  if (!(await dashboardEstConnecte())) throw new Error("Non autorisé.");
  const { base64, nomFichier } = await genererPdfClotureVendeurs(editionId);
  await queuerDocumentImpression(nomFichier, base64);
}
