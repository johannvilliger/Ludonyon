// Forme du contenu figé dans etiquettes_articles_impression.contenu_json
// (voir migration 0033) — partagée entre l'écriture
// (accueil/vendeur/[code]/etiquettes/actions.ts) et la lecture (API
// /api/etiquettes-articles, consommée par print-agent). Les cases sont déjà
// développées dans l'ordre d'impression (une entrée "normal" par copie
// demandée, une entrée "texte" par étiquette "nom en entier" cochée) — le
// même calcul que celui déjà fait côté navigateur (voir
// etiquettes-vendeur.tsx), pour que la feuille envoyée à l'impression
// centralisée soit identique à ce que montrait l'aperçu.
export type CaseEtiquette =
  | { type: "normal"; numeroArticle: number; nom: string; prix: number }
  | { type: "texte"; nom: string };

export type ContenuEtiquettesArticles = {
  numeroVendeur: number;
  nomVendeur: string;
  telephone: string | null;
  special: boolean;
  cases: CaseEtiquette[];
};
