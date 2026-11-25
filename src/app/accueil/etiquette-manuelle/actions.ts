"use server";

import QRCode from "qrcode";
import { nouvelId, query, queryOne } from "@/lib/db";
import { accueilEstConnecte } from "@/lib/gestion";
import type { CaseEtiquette, ContenuEtiquettesArticles } from "@/lib/etiquettes-articles-impression";
import { prixAfficheEtiquette } from "@/lib/etiquettes-articles-impression";
import { estVendeurSpecial } from "@/lib/vendeurs-speciaux";

// Planche Herma 4357 : 4 colonnes x 10 lignes — même constante que côté
// navigateur (voir etiquette-manuelle-form.tsx) et print-agent.
const NB_ETIQUETTES = 40;

export type ArticleEtiquette = {
  numeroArticle: number;
  nom: string;
  prix: number;
  // Prix réel de vente (prix catalogue + majoration acheteur) : à afficher
  // sur l'étiquette à la place de `prix`, qui lui reste le prix catalogue
  // brut encodé dans le QR (voir prixAfficheEtiquette).
  prixAffiche: number;
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

  const edition = await queryOne<{ id: string; taux_achat: number }>(
    "SELECT id, taux_achat FROM editions WHERE active_flag = 1",
  );
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
    article: {
      numeroArticle: article.numero_article,
      nom: article.nom,
      prix: article.prix,
      prixAffiche: prixAfficheEtiquette(article.prix, Number(edition.taux_achat)),
      svg,
    },
  };
}

export type ResultatEnvoiManuel = { error: string | null };

// Dépose dans la même file d'attente que l'envoi depuis la fiche vendeur
// (migration 0033), mais avec avecContact:false (pas de 2e étiquette
// coordonnées sur une feuille déjà entamée) et des cases "vide" en tête pour
// que l'unique vraie étiquette atterrisse exactement sur la case choisie par
// le bénévole sur la feuille physique — voir etiquettes-pdf.js côté
// print-agent.
export async function envoyerEtiquetteManuellePourImpression(
  numeroVendeur: number,
  numeroArticle: number,
  position: number,
): Promise<ResultatEnvoiManuel> {
  if (!(await accueilEstConnecte())) throw new Error("Non autorisé.");

  if (!Number.isInteger(position) || position < 0 || position >= NB_ETIQUETTES) {
    return { error: "Position invalide." };
  }

  const edition = await queryOne<{ id: string; taux_achat: number }>(
    "SELECT id, taux_achat FROM editions WHERE active_flag = 1",
  );
  if (!edition) return { error: "Aucune édition active actuellement." };

  const participation = await queryOne<{ id: string }>(
    "SELECT id FROM participations WHERE edition_id = ? AND numero_vendeur = ?",
    [edition.id, numeroVendeur],
  );
  if (!participation) return { error: `Vendeur n° ${numeroVendeur} introuvable.` };

  const article = await queryOne<{ numero_article: number; nom: string; prix: number }>(
    "SELECT numero_article, nom, prix FROM articles WHERE participation_id = ? AND numero_article = ?",
    [participation.id, numeroArticle],
  );
  if (!article) {
    return { error: `Article n° ${numeroArticle} introuvable pour le vendeur ${numeroVendeur}.` };
  }

  const cases: CaseEtiquette[] = [
    ...Array.from({ length: position }, (): CaseEtiquette => ({ type: "vide" })),
    { type: "normal", numeroArticle: article.numero_article, nom: article.nom, prix: article.prix },
  ];

  const contenu: ContenuEtiquettesArticles = {
    numeroVendeur,
    nomVendeur: "",
    telephone: null,
    special: estVendeurSpecial(numeroVendeur),
    avecContact: false,
    tauxAchat: Number(edition.taux_achat),
    cases,
  };

  await query(
    "INSERT INTO etiquettes_articles_impression (id, participation_id, numero_vendeur, contenu_json) VALUES (?, ?, ?, ?)",
    [nouvelId(), participation.id, numeroVendeur, JSON.stringify(contenu)],
  );

  return { error: null };
}
