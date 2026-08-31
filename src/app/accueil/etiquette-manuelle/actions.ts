"use server";

import QRCode from "qrcode";
import { queryOne } from "@/lib/db";
import { accueilEstConnecte } from "@/lib/gestion";

export type ArticleEtiquette = {
  numeroArticle: number;
  nom: string;
  prix: number;
  svg: string;
};

export type RechercheEtiquetteResult = { ok: true; article: ArticleEtiquette } | { ok: false; error: string };

// Pas de filtre sur le statut de l'article : on peut avoir besoin de
// réimprimer une étiquette pour n'importe quel article (perdue, abîmée,
// mal collée...), même déjà vendu.
export async function rechercherArticlePourEtiquette(
  numeroVendeur: number,
  numeroArticle: number,
): Promise<RechercheEtiquetteResult> {
  if (!(await accueilEstConnecte())) throw new Error("Non autorisé.");

  const edition = await queryOne<{ id: string }>("SELECT id FROM editions WHERE active_flag = 1");
  if (!edition) return { ok: false, error: "Aucune édition active actuellement." };

  const participation = await queryOne<{ id: string }>(
    "SELECT id FROM participations WHERE edition_id = ? AND numero_vendeur = ?",
    [edition.id, numeroVendeur],
  );
  if (!participation) return { ok: false, error: `Vendeur n° ${numeroVendeur} introuvable.` };

  const article = await queryOne<{ numero_article: number; nom: string; prix: number }>(
    "SELECT numero_article, nom, prix FROM articles WHERE participation_id = ? AND numero_article = ?",
    [participation.id, numeroArticle],
  );
  if (!article) {
    return { ok: false, error: `Article n° ${numeroArticle} introuvable pour le vendeur ${numeroVendeur}.` };
  }

  // Même contenu de QR (et même config) que la feuille d'étiquettes
  // générée à la réception — pour que la caisse le lise exactement pareil.
  const contenuQr = `${numeroVendeur}-${String(article.numero_article).padStart(2, "0")}-${article.prix}`;
  const svg = await QRCode.toString(contenuQr, { type: "svg", margin: 1, errorCorrectionLevel: "M" });

  return {
    ok: true,
    article: { numeroArticle: article.numero_article, nom: article.nom, prix: article.prix, svg },
  };
}
