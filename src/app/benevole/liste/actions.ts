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
    // Un remplacement complet (delete + insert) perdrait le suivi
    // d'impression d'étiquette (voir migration 0027) même pour un article
    // resté identique — on le fait donc correspondre à l'ancien par nom
    // (normalisé) avant de le supprimer, et on reporte son instantané
    // d'étiquette sur la nouvelle ligne. Un nom changé perd le suivi (il
    // s'agit alors d'un article différent) ; un prix changé le garde,
    // affiché ensuite comme "modifiée depuis impression" — comportement
    // voulu.
    const [ancienRows] = await conn.query<RowDataPacket[]>(
      `SELECT nom, etiquette_nom_imprime, etiquette_prix_imprime, etiquette_imprimee_le
       FROM articles WHERE participation_id = ? AND statut = 'non_recu'`,
      [participation.id],
    );
    const etiquettesParNom = new Map(
      ancienRows.map((r) => [
        String(r.nom).trim().toLowerCase(),
        {
          etiquette_nom_imprime: r.etiquette_nom_imprime as string | null,
          etiquette_prix_imprime: r.etiquette_prix_imprime as number | null,
          etiquette_imprimee_le: r.etiquette_imprimee_le as Date | null,
        },
      ]),
    );

    await conn.query("DELETE FROM articles WHERE participation_id = ? AND statut = 'non_recu'", [
      participation.id,
    ]);
    const [rows] = await conn.query<RowDataPacket[]>(
      "SELECT COALESCE(MAX(numero_article), 0) + 1 AS suivant FROM articles WHERE participation_id = ?",
      [participation.id],
    );
    let numero = (rows[0]?.suivant as number) ?? 1;
    for (const a of articles) {
      const nom = a.nom.trim();
      const ancienneEtiquette = etiquettesParNom.get(nom.toLowerCase());
      await conn.query(
        `INSERT INTO articles
           (id, participation_id, numero_article, nom, prix, etiquette_nom_imprime, etiquette_prix_imprime, etiquette_imprimee_le)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          nouvelId(),
          participation.id,
          numero++,
          nom,
          Math.round(a.prix),
          ancienneEtiquette?.etiquette_nom_imprime ?? null,
          ancienneEtiquette?.etiquette_prix_imprime ?? null,
          ancienneEtiquette?.etiquette_imprimee_le ?? null,
        ],
      );
    }
  });

  revalidatePath("/benevole/liste");
}
