// Forme du contenu figé dans etiquettes_articles_impression.contenu_json
// (voir migration 0033) — partagée entre l'écriture
// (accueil/vendeur/[code]/etiquettes/actions.ts) et la lecture (API
// /api/etiquettes-articles, consommée par print-agent). Les cases sont déjà
// développées dans l'ordre d'impression (une entrée "normal" par copie
// demandée, une entrée "texte" par étiquette "nom en entier" cochée) — le
// même calcul que celui déjà fait côté navigateur (voir
// etiquettes-vendeur.tsx), pour que la feuille envoyée à l'impression
// centralisée soit identique à ce que montrait l'aperçu.
// "vide" : case à sauter sans rien dessiner — sert à la réimpression d'une
// étiquette isolée sur une feuille déjà partiellement utilisée
// (accueil/etiquette-manuelle), où il faut atterrir exactement sur LA case
// encore vierge choisie par le bénévole sans rien imprimer sur les autres.
export type CaseEtiquette =
  | { type: "normal"; numeroArticle: number; nom: string; prix: number }
  | { type: "texte"; nom: string }
  | { type: "vide" };

export type ContenuEtiquettesArticles = {
  numeroVendeur: number;
  nomVendeur: string;
  telephone: string | null;
  special: boolean;
  // Optionnel (undefined = true) pour rester compatible avec les feuilles
  // déjà en file d'attente au moment de ce changement. false : la feuille ne
  // réserve pas la case 0 pour l'étiquette coordonnées (réimpression d'un
  // article isolé, pas un envoi complet depuis la fiche vendeur).
  avecContact?: boolean;
  cases: CaseEtiquette[];
};
