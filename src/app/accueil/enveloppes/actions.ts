"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { accueilEstConnecte } from "@/lib/gestion";

export type ResultatRemise = { error: string | null };

// Restreint aux images générées par SignaturePad (data URL PNG) — jamais de
// contenu arbitraire fourni par le client stocké tel quel en base.
export async function confirmerRemiseEnveloppe(
  participationId: string,
  signatureDataUrl: string,
): Promise<ResultatRemise> {
  if (!(await accueilEstConnecte())) throw new Error("Non autorisé.");
  if (!signatureDataUrl.startsWith("data:image/png;base64,")) {
    return { error: "Signature invalide." };
  }

  await query(
    "UPDATE participations SET enveloppe_recuperee_le = NOW(), enveloppe_signature = ? WHERE id = ?",
    [signatureDataUrl, participationId],
  );

  revalidatePath("/accueil/enveloppes");
  return { error: null };
}
