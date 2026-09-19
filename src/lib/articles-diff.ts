// Compare la liste d'articles actuelle à l'instantané pris à la dernière
// impression (participations.articles_imprimes_json) — utilisé sur
// /gestion/dashboard/vendeurs pour surligner ce qui a changé depuis
// l'impression d'une feuille, plutôt que de maintenir un statut séparé qui
// pourrait se désynchroniser de la réalité (voir migration 0026).
export type ArticleSimple = { nom: string; prix: number };

export type LigneDiff =
  | { type: "inchange"; nom: string; prix: number }
  | { type: "ajoute"; nom: string; prix: number }
  | { type: "supprime"; nom: string; prix: number }
  | { type: "prix_modifie"; nom: string; prixAvant: number; prixApres: number };

function normaliser(nom: string): string {
  return nom.trim().toLowerCase();
}

export function calculerDiffImpression(
  imprimes: ArticleSimple[] | null,
  actuels: ArticleSimple[],
): { modifiee: boolean; lignes: LigneDiff[] } | null {
  if (!imprimes) return null;

  const imprimesParNom = new Map(imprimes.map((a) => [normaliser(a.nom), a]));
  const actuelsParNom = new Set(actuels.map((a) => normaliser(a.nom)));

  const lignes: LigneDiff[] = actuels.map((a) => {
    const avant = imprimesParNom.get(normaliser(a.nom));
    if (!avant) return { type: "ajoute", nom: a.nom, prix: a.prix };
    if (avant.prix !== a.prix) {
      return { type: "prix_modifie", nom: a.nom, prixAvant: avant.prix, prixApres: a.prix };
    }
    return { type: "inchange", nom: a.nom, prix: a.prix };
  });

  for (const a of imprimes) {
    if (!actuelsParNom.has(normaliser(a.nom))) {
      lignes.push({ type: "supprime", nom: a.nom, prix: a.prix });
    }
  }

  const modifiee = lignes.some((l) => l.type !== "inchange");
  return { modifiee, lignes };
}
