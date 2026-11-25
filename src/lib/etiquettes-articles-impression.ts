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
//
// prix : toujours le prix catalogue BRUT (articles.prix), jamais le prix
// affiché à l'acheteur. C'est cette valeur, et uniquement elle, qui doit
// entrer dans la chaîne du QR (voir dessinerQr côté print-agent et le SVG
// généré côté navigateur/serveur) : rechercherArticle (caisse/[numero]/
// actions.ts) compare le prix scanné à articles.prix à l'octet près, et
// refuse la vente si ça ne correspond pas. Seul le TEXTE imprimé du prix
// doit utiliser prixAfficheEtiquette ci-dessous.
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
  // Taux acheteur (taux_achat) de l'édition au moment de l'envoi — permet au
  // texte imprimé du prix de refléter ce que l'acheteur paie réellement
  // (prix catalogue + majoration), sans jamais toucher au prix encodé dans
  // le QR (voir prixAfficheEtiquette).
  tauxAchat: number;
  cases: CaseEtiquette[];
};

// Prix réel de vente affiché sur l'étiquette (prix catalogue + majoration
// acheteur), par opposition au prix catalogue brut qui reste seul encodé
// dans le QR — même formule que prixAffiche dans caisse-scanner.tsx (ce que
// l'acheteur paie réellement à la caisse).
export function prixAfficheEtiquette(prix: number, tauxAchat: number): number {
  return Math.round(prix * (1 + tauxAchat) * 100) / 100;
}
