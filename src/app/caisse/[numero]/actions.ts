"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { nouvelId, query, queryOne, withTransaction } from "@/lib/db";
import { COOKIE_CAISSE } from "@/lib/gestion";

export type ArticleTrouve = {
  articleId: string;
  numeroVendeur: number;
  numeroArticle: number;
  nomVendeur: string;
  nom: string;
  prix: number;
  estBenevole: boolean;
};

export type RechercheResult = { ok: true; article: ArticleTrouve } | { ok: false; error: string };

export async function rechercherArticle(editionId: string, codeBrut: string): Promise<RechercheResult> {
  const match = codeBrut.trim().match(/^(\d+)-(\d+)-(\d+)$/);
  if (!match) return { ok: false, error: `Code illisible : « ${codeBrut} »` };

  const numeroVendeur = Number(match[1]);
  const numeroArticle = Number(match[2]);
  const prixScanne = Number(match[3]);

  const participation = await queryOne<{ id: string; est_benevole: number; nom_vendeur: string }>(
    `SELECT p.id, p.est_benevole, v.nom AS nom_vendeur
     FROM participations p
     JOIN vendeurs v ON v.id = p.vendeur_id
     WHERE p.edition_id = ? AND p.numero_vendeur = ?`,
    [editionId, numeroVendeur],
  );

  if (!participation) return { ok: false, error: `Vendeur n° ${numeroVendeur} introuvable.` };

  const article = await queryOne<{ id: string; numero_article: number; nom: string; prix: number }>(
    "SELECT id, numero_article, nom, prix FROM articles WHERE participation_id = ? AND numero_article = ?",
    [participation.id, numeroArticle],
  );

  if (!article) {
    return { ok: false, error: `Article n° ${numeroArticle} introuvable pour le vendeur ${numeroVendeur}.` };
  }

  if (article.prix !== prixScanne) {
    return {
      ok: false,
      error: `Prix incohérent sur « ${article.nom} » : étiquette ${prixScanne}.– mais liste ${article.prix}.– — vérifiez l'objet avant d'encaisser.`,
    };
  }

  const dejaVendu = await queryOne<{ id: string }>("SELECT id FROM vente_articles WHERE article_id = ?", [article.id]);

  if (dejaVendu) {
    return { ok: false, error: `« ${article.nom} » (vendeur n° ${numeroVendeur}) a déjà été vendu.` };
  }

  return {
    ok: true,
    article: {
      articleId: article.id,
      numeroVendeur,
      numeroArticle: article.numero_article,
      nomVendeur: participation.nom_vendeur,
      nom: article.nom,
      prix: article.prix,
      estBenevole: Boolean(participation.est_benevole),
    },
  };
}

export type EncaissementResult = { ok: true; total: number } | { ok: false; error: string };

export async function encaisserPanier(
  caisseId: string,
  editionId: string,
  acheteurBenevole: boolean,
  articleIds: string[],
): Promise<EncaissementResult> {
  if (articleIds.length === 0) return { ok: false, error: "Le panier est vide." };

  const edition = await queryOne<{ taux_achat: number }>("SELECT taux_achat FROM editions WHERE id = ?", [editionId]);
  if (!edition) return { ok: false, error: "Édition introuvable." };

  const placeholders = articleIds.map(() => "?").join(", ");
  const articles = await query<{ id: string; prix: number }>(
    `SELECT id, prix FROM articles WHERE id IN (${placeholders})`,
    articleIds,
  );

  if (articles.length !== articleIds.length) {
    return { ok: false, error: "Un des articles du panier n'existe plus." };
  }

  const venteId = nouvelId();
  const lignes = articles.map((a) => ({
    id: nouvelId(),
    article_id: a.id,
    prix_encaisse: acheteurBenevole ? a.prix : Math.round(a.prix * (1 + Number(edition.taux_achat))),
  }));

  try {
    await withTransaction(async (conn) => {
      await conn.query("INSERT INTO ventes (id, edition_id, caisse_id, acheteur_benevole) VALUES (?, ?, ?, ?)", [
        venteId,
        editionId,
        caisseId,
        acheteurBenevole,
      ]);

      for (const ligne of lignes) {
        await conn.query("INSERT INTO vente_articles (id, vente_id, article_id, prix_encaisse) VALUES (?, ?, ?, ?)", [
          ligne.id,
          venteId,
          ligne.article_id,
          ligne.prix_encaisse,
        ]);
      }

      await conn.query(`UPDATE articles SET statut = 'vendu' WHERE id IN (${placeholders})`, articleIds);
    });
  } catch (err) {
    const mysqlErr = err as { code?: string };
    if (mysqlErr.code === "ER_DUP_ENTRY") {
      return {
        ok: false,
        error: "Un des articles vient d'être vendu depuis une autre caisse entre-temps — retirez-le du panier et réessayez.",
      };
    }
    return { ok: false, error: "Impossible d'encaisser, réessayez." };
  }

  const total = lignes.reduce((sum, l) => sum + l.prix_encaisse, 0);
  return { ok: true, total };
}

export async function voirInstructions(posteId: string) {
  await query("UPDATE caisses SET instructions_vues = 1 WHERE poste_caisse_id = ? AND edition_id = (SELECT id FROM editions WHERE active_flag = 1)", [
    posteId,
  ]);
}

export async function cloturerCaisse(caisseId: string, posteId: string) {
  await query("UPDATE caisses SET cloturee = 1 WHERE id = ?", [caisseId]);
  await query("UPDATE postes_caisse SET connecte = 0, session_token = NULL, demande_en_attente = 0 WHERE id = ?", [
    posteId,
  ]);

  const jar = await cookies();
  jar.delete(COOKIE_CAISSE);
  redirect("/gestion");
}
