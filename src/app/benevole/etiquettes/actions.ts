"use server";

import { query, queryOne } from "@/lib/db";
import { benevoleConnecte } from "@/lib/benevole-session";

// Marque les étiquettes comme imprimées au moment du clic sur "Imprimer",
// avant l'ouverture du dialogue d'impression du navigateur — comme pour les
// tickets de caisse (print-agent), impossible de détecter côté serveur si
// l'impression a réellement été validée ou annulée. Restreint aux articles
// du bénévole connecté : jamais de numéro de vendeur fourni par le client,
// pour qu'un bénévole ne puisse pas marquer/imprimer les étiquettes d'un
// autre vendeur.
export async function marquerEtiquettesImprimees(numerosArticle: number[]): Promise<void> {
  const session = await benevoleConnecte();
  if (!session) throw new Error("Non autorisé.");
  if (numerosArticle.length === 0) return;

  const participation = await queryOne<{ id: string }>(
    `SELECT p.id FROM participations p JOIN editions e ON e.id = p.edition_id
     WHERE p.vendeur_id = ? AND e.active_flag = 1`,
    [session.vendeurId],
  );
  if (!participation) throw new Error("Aucune édition active.");

  const placeholders = numerosArticle.map(() => "?").join(",");
  await query(
    `UPDATE articles
     SET etiquette_nom_imprime = nom, etiquette_prix_imprime = prix, etiquette_imprimee_le = NOW()
     WHERE participation_id = ? AND numero_article IN (${placeholders})`,
    [participation.id, ...numerosArticle],
  );
}
