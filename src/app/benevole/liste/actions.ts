"use server";

import { revalidatePath } from "next/cache";
import type { RowDataPacket } from "mysql2/promise";
import { nouvelId, queryOne, withTransaction } from "@/lib/db";
import { benevoleConnecte } from "@/lib/benevole-session";
import { erreurArticles } from "@/lib/validation-articles";

type ArticleInput = { nom: string; prix: number };

// Pas de plafond de 30 articles ici, comme pour les comptes 9xx gérés
// depuis l'accueil — c'est la même règle, juste en self-service. Remplace
// entièrement les articles encore "non_recu" (les seuls modifiables ici) —
// ceux déjà reçus/vendus/invendus/refusés ne sont jamais touchés.
export async function enregistrerArticlesBenevole(articles: ArticleInput[]) {
  const session = await benevoleConnecte();
  if (!session) throw new Error("Session expirée, reconnectez-vous.");

  const participation = await queryOne<{ id: string }>(
    `SELECT p.id FROM participations p JOIN editions e ON e.id = p.edition_id WHERE p.vendeur_id = ? AND e.active_flag = 1`,
    [session.vendeurId],
  );
  if (!participation) throw new Error("Aucune édition active pour le moment.");

  const erreurArticle = erreurArticles(articles);
  if (erreurArticle) throw new Error(erreurArticle);

  await withTransaction(async (conn) => {
    await conn.query("DELETE FROM articles WHERE participation_id = ? AND statut = 'non_recu'", [
      participation.id,
    ]);
    const [rows] = await conn.query<RowDataPacket[]>(
      "SELECT COALESCE(MAX(numero_article), 0) + 1 AS suivant FROM articles WHERE participation_id = ?",
      [participation.id],
    );
    let numero = (rows[0]?.suivant as number) ?? 1;
    for (const a of articles) {
      await conn.query(
        "INSERT INTO articles (id, participation_id, numero_article, nom, prix) VALUES (?, ?, ?, ?, ?)",
        [nouvelId(), participation.id, numero++, a.nom.trim(), Math.round(a.prix)],
      );
    }
  });

  revalidatePath("/benevole/liste");
}
