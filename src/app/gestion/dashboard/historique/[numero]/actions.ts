"use server";

import { envoyerUneQuittance } from "@/app/caisse/[numero]/actions";
import { nouvelId, query, queryOne } from "@/lib/db";
import { queuerDocumentImpression } from "@/lib/documents-impression";
import { emailValide } from "@/lib/email-format";
import { dashboardEstConnecte } from "@/lib/gestion";
import { genererPdfQuittance } from "@/lib/quittance-pdf";

export type ResultatQuittance = { ok: boolean; error?: string };

// Sort une quittance pour une vente déjà encaissée, sans que l'acheteur l'ait
// demandée sur le moment (voir emailQuittance dans encaisserPanier) — utile
// en phase clôture si un acheteur revient réclamer un justificatif. L'envoi
// est ici immédiat (contrairement au flux normal, voir migration 0019) : la
// vente vient forcément de l'historique, donc n'est plus jamais "la dernière
// vente" d'aucune caisse active et ne risque plus d'être annulée après coup.
export async function demanderQuittanceRetroactive(venteId: string, email: string): Promise<ResultatQuittance> {
  if (!(await dashboardEstConnecte())) return { ok: false, error: "Non autorisé." };

  const emailPropre = email.trim();
  if (!emailValide(emailPropre)) return { ok: false, error: "Adresse email invalide." };

  const vente = await queryOne<{ caisse_id: string }>("SELECT caisse_id FROM ventes WHERE id = ?", [venteId]);
  if (!vente) return { ok: false, error: "Vente introuvable." };

  const quittanceId = nouvelId();
  await query("INSERT INTO quittances (id, vente_id, caisse_id, email) VALUES (?, ?, ?, ?)", [
    quittanceId,
    venteId,
    vente.caisse_id,
    emailPropre,
  ]);
  await envoyerUneQuittance(quittanceId);

  const resultat = await queryOne<{ statut: string }>("SELECT statut FROM quittances WHERE id = ?", [quittanceId]);
  if (resultat?.statut !== "envoyee") {
    return { ok: false, error: "Échec de l'envoi (réessayable depuis /gestion/dashboard/quittances)." };
  }
  return { ok: true };
}

// Même reçu, envoyé à l'impression centralisée (documents_impression, voir
// migration 0039) plutôt que par email — pour remettre un papier en main
// propre sans connaître l'email de l'acheteur.
export async function imprimerQuittanceRetroactive(venteId: string): Promise<ResultatQuittance> {
  if (!(await dashboardEstConnecte())) return { ok: false, error: "Non autorisé." };

  const document = await genererPdfQuittance(venteId);
  if (!document) return { ok: false, error: "Vente introuvable." };

  await queuerDocumentImpression(document.nomFichier, document.base64);
  return { ok: true };
}
