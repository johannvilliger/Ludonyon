// Tout montant encaissé/dû dépend d'un taux (±10%) appliqué à un prix
// entier : le résultat a presque toujours des centimes (5.– devient 5.50 à
// l'achat, 4.50 pour le vendeur) — jamais arrondi au franc. On travaille en
// centimes entiers pour l'arrondi (évite les artefacts de flottants type
// 24.799999999998) puis on ne formate qu'à l'affichage.
export function arrondiCentimes(valeur: number): number {
  return Math.round(valeur * 100) / 100;
}

// Convention suisse : "24.–" si rond, "24.80" si centimes.
export function formaterMontant(valeur: number): string {
  const centimes = Math.round(valeur * 100);
  // Signe géré à part : pour un montant entre -1 et 0 (ex. -0.05), la
  // partie francs vaut Math.trunc(...) = -0, qui s'affiche "0" sans son
  // signe une fois converti en chaîne — le signe se perdrait silencieusement.
  const negatif = centimes < 0;
  const abs = Math.abs(centimes);
  const francs = Math.trunc(abs / 100);
  const reste = abs % 100;
  const corps = reste === 0 ? `${francs}.–` : `${francs}.${String(reste).padStart(2, "0")}`;
  return negatif ? `-${corps}` : corps;
}
