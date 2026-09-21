// Statut d'impression d'un article — voir migration 0027. Compare l'état
// actuel de l'article à l'instantané pris au moment où son étiquette a été
// imprimée (nom + prix), sans maintenir un statut stocké séparément qui
// pourrait se désynchroniser (même logique que calculerDiffImpression dans
// articles-diff.ts, mais à l'échelle d'un seul article).
export type StatutEtiquette = "jamais_imprimee" | "imprimee" | "modifiee";

export function statutEtiquetteArticle(article: {
  nom: string;
  prix: number;
  etiquette_nom_imprime: string | null;
  etiquette_prix_imprime: number | null;
  etiquette_imprimee_le: string | null;
}): StatutEtiquette {
  if (!article.etiquette_imprimee_le) return "jamais_imprimee";
  if (article.etiquette_nom_imprime === article.nom && article.etiquette_prix_imprime === article.prix) {
    return "imprimee";
  }
  return "modifiee";
}

// Libellés courts : pensés pour une grille compacte à 2 colonnes (901/902),
// pas la place pour "Étiquette : modifiée depuis impression".
export const ETIQUETTE_LABELS: Record<StatutEtiquette, string> = {
  jamais_imprimee: "À imprimer",
  imprimee: "Imprimée",
  modifiee: "Modifiée",
};

export const ETIQUETTE_STYLES: Record<StatutEtiquette, string> = {
  jamais_imprimee: "bg-zinc-100 text-zinc-500",
  imprimee: "bg-emerald-100 text-emerald-800",
  modifiee: "bg-red-100 text-red-700",
};
