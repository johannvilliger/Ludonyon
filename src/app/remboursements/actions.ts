"use server";

import { arrondiCentimes } from "@/lib/argent";
import { nouvelId, query, queryOne, withTransaction } from "@/lib/db";

export type LigneRemboursable = {
  venteArticleId: string;
  nom: string;
  numeroVendeur: number;
  numeroArticle: number;
  prixEncaisse: number;
  numeroCaisseOrigine: number;
  venteCreatedAt: string;
};

export type RechercheRemboursementParams = {
  numeroVendeur?: number;
  numeroArticle?: number;
  heure?: string;
};

// Uniquement les lignes ENCORE actives (remboursee_le IS NULL) : une vente
// déjà remboursée ne doit plus apparaître comme remboursable une seconde
// fois, mais reste bien dans vente_articles pour l'historique de sa caisse
// de vente d'origine (jamais supprimée, voir migration 0020).
export async function rechercherVentesPourRemboursement(
  editionId: string,
  params: RechercheRemboursementParams,
): Promise<LigneRemboursable[]> {
  if (params.numeroVendeur == null && params.numeroArticle == null && !params.heure) return [];

  const conditions: string[] = ["v.edition_id = ?", "va.remboursee_le IS NULL"];
  const args: (string | number)[] = [editionId];

  if (params.numeroVendeur != null) {
    conditions.push("p.numero_vendeur = ?");
    args.push(params.numeroVendeur);
  }
  if (params.numeroArticle != null) {
    conditions.push("a.numero_article = ?");
    args.push(params.numeroArticle);
  }
  if (params.heure) {
    conditions.push("TIME_FORMAT(v.created_at, '%H:%i') = ?");
    args.push(params.heure);
  }

  const lignes = await query<{
    id: string;
    nom: string;
    numero_vendeur: number;
    numero_article: number;
    prix_encaisse: number;
    numero_caisse: number;
    created_at: string;
  }>(
    `SELECT va.id, a.nom, p.numero_vendeur, a.numero_article, va.prix_encaisse,
            pc.numero AS numero_caisse, v.created_at
     FROM vente_articles va
     JOIN ventes v ON v.id = va.vente_id
     JOIN articles a ON a.id = va.article_id
     JOIN participations p ON p.id = a.participation_id
     JOIN caisses c ON c.id = v.caisse_id
     JOIN postes_caisse pc ON pc.id = c.poste_caisse_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY v.created_at DESC
     LIMIT 200`,
    args,
  );

  return lignes.map((l) => ({
    venteArticleId: l.id,
    nom: l.nom,
    numeroVendeur: l.numero_vendeur,
    numeroArticle: l.numero_article,
    prixEncaisse: Number(l.prix_encaisse),
    numeroCaisseOrigine: l.numero_caisse,
    venteCreatedAt: l.created_at,
  }));
}

export type RemboursementResult = { ok: true; total: number } | { ok: false; error: string };

// Rembourse 1..N lignes de vente choisies dans les résultats de recherche.
// La ligne vente_articles d'origine n'est jamais supprimée (théorique de sa
// caisse de vente inchangé) ; on la marque juste remboursee_le et on libère
// article_id_libre pour permettre une revente. L'argent rendu est tracé côté
// caisse de remboursement uniquement, via la table remboursements — jamais
// dans les transactions de la caisse de vente d'origine.
export async function rembourserArticles(
  caisseId: string,
  venteArticleIds: string[],
  effectuePar: string,
): Promise<RemboursementResult> {
  if (venteArticleIds.length === 0) return { ok: false, error: "Aucun article sélectionné." };
  if (!effectuePar.trim()) return { ok: false, error: "Indiquez qui effectue le remboursement." };

  const placeholders = venteArticleIds.map(() => "?").join(", ");
  const lignes = await query<{ id: string; article_id: string; prix_encaisse: number; remboursee_le: string | null }>(
    `SELECT id, article_id, prix_encaisse, remboursee_le FROM vente_articles WHERE id IN (${placeholders})`,
    venteArticleIds,
  );

  if (lignes.length !== venteArticleIds.length) {
    return { ok: false, error: "Une des lignes sélectionnées n'existe plus — rechargez la recherche." };
  }
  if (lignes.some((l) => l.remboursee_le !== null)) {
    return { ok: false, error: "Une des ventes sélectionnées a déjà été remboursée entre-temps — rechargez la recherche." };
  }

  const articleIds = lignes.map((l) => l.article_id);
  const articlePlaceholders = articleIds.map(() => "?").join(", ");
  const total = arrondiCentimes(lignes.reduce((sum, l) => sum + Number(l.prix_encaisse), 0));

  try {
    await withTransaction(async (conn) => {
      await conn.query(
        `UPDATE vente_articles SET remboursee_le = NOW(), article_id_libre = NULL WHERE id IN (${placeholders})`,
        venteArticleIds,
      );
      await conn.query(`UPDATE articles SET statut = 'recu' WHERE id IN (${articlePlaceholders})`, articleIds);
      await conn.query(`DELETE FROM articles_reserves WHERE article_id IN (${articlePlaceholders})`, articleIds);

      for (const ligne of lignes) {
        await conn.query(
          "INSERT INTO remboursements (id, vente_article_id, caisse_id, effectue_par) VALUES (?, ?, ?, ?)",
          [nouvelId(), ligne.id, caisseId, effectuePar.trim()],
        );
      }
    });
  } catch {
    return { ok: false, error: "Impossible d'enregistrer le remboursement, réessayez." };
  }

  return { ok: true, total };
}

export type RemboursementEffectue = {
  nom: string;
  numeroVendeur: number;
  montant: number;
  createdAt: string;
};

export async function remboursementsEffectues(caisseId: string): Promise<RemboursementEffectue[]> {
  const lignes = await query<{ nom: string; numero_vendeur: number; prix_encaisse: number; created_at: string }>(
    `SELECT a.nom, p.numero_vendeur, va.prix_encaisse, r.created_at
     FROM remboursements r
     JOIN vente_articles va ON va.id = r.vente_article_id
     JOIN articles a ON a.id = va.article_id
     JOIN participations p ON p.id = a.participation_id
     WHERE r.caisse_id = ?
     ORDER BY r.created_at DESC`,
    [caisseId],
  );
  return lignes.map((l) => ({
    nom: l.nom,
    numeroVendeur: l.numero_vendeur,
    montant: Number(l.prix_encaisse),
    createdAt: l.created_at,
  }));
}

// Symétrique de theoriqueCaisse (caisse/[numero]/actions.ts) mais en sens
// inverse : l'argent SORT de cette caisse (remboursements) au lieu d'y
// entrer (ventes). Négatif dès qu'un remboursement a eu lieu — attendu,
// c'est un déficit par rapport au fond de départ.
export async function theoriqueCaisseRemboursement(caisseId: string): Promise<number> {
  const theorique = await queryOne<{ remboursements: number; vidages: number }>(
    `SELECT
       COALESCE((SELECT SUM(va.prix_encaisse) FROM remboursements r JOIN vente_articles va ON va.id = r.vente_article_id WHERE r.caisse_id = ?), 0) AS remboursements,
       COALESCE((SELECT SUM(mc.montant) FROM mouvements_caisse mc WHERE mc.caisse_id = ?), 0) AS vidages`,
    [caisseId, caisseId],
  );
  return theorique ? arrondiCentimes(-Number(theorique.remboursements) - Number(theorique.vidages)) : 0;
}
