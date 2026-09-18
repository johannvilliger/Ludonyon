// Forme du contenu figé dans etiquettes_impression.contenu_json (voir
// migration 0024) — partagée entre l'écriture (caisse/[numero]/actions.ts)
// et la lecture (API /api/etiquettes, consommée par print-agent).
export type ContenuTicket = {
  numeroCaisse: number;
  dateVente: string;
  articles: { nom: string; numeroVendeur: number; prixEncaisse: number }[];
  total: number;
  tauxAchat: number;
};
