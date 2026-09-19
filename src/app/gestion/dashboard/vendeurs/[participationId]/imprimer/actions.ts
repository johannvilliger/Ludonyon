"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { dashboardEstConnecte } from "@/lib/gestion";

// Enregistre un instantané de la liste au moment de l'impression (comparé à
// la liste actuelle sur /gestion/dashboard/vendeurs pour surligner ce qui a
// changé depuis) — déclenché au clic sur "Imprimer", avant l'ouverture du
// dialogue d'impression du navigateur : on ne peut pas détecter côté
// serveur si l'impression a réellement été validée ou annulée, donc le clic
// lui-même fait foi, comme demandé.
export async function marquerListeImprimee(participationId: string): Promise<void> {
  if (!(await dashboardEstConnecte())) throw new Error("Non autorisé.");

  const articles = await query<{ nom: string; prix: number }>(
    "SELECT nom, prix FROM articles WHERE participation_id = ? ORDER BY numero_article",
    [participationId],
  );

  await query("UPDATE participations SET articles_imprimes_json = ?, imprimee_le = NOW() WHERE id = ?", [
    JSON.stringify(articles),
    participationId,
  ]);

  revalidatePath("/gestion/dashboard/vendeurs");
}
