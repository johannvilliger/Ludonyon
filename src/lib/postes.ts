// Postes de bénévole pour le planning des ouvertures — fixés uniquement
// par un responsable/comité (jamais en libre-service), utilisés pour
// filtrer qui est notifié lors d'une recherche de remplaçant.
export const POSTES = ["ACCUEIL", "RETOUR", "SORTIE"] as const;
export type Poste = (typeof POSTES)[number];

export const POSTE_LABELS: Record<Poste, string> = {
  ACCUEIL: "Accueil",
  RETOUR: "Poste retour",
  SORTIE: "Poste sortie",
};

// Libellé affiché pour un poste non renseigné (bénévole pas encore formé
// aux ouvertures).
export const POSTE_UNSET_LABEL = "En formation";

// Hiérarchie croissante : un poste peut couvrir tous les postes de
// niveau inférieur ou égal (ex. Sortie remplace Accueil, Retour ou
// Sortie ; Accueil ne remplace qu'Accueil).
const POSTE_LEVEL: Record<Poste, number> = {
  ACCUEIL: 1,
  RETOUR: 2,
  SORTIE: 3,
};

export function isValidPoste(value: string): value is Poste {
  return (POSTES as readonly string[]).includes(value);
}

export function canCoverPoste(candidatePoste: Poste, requiredPoste: Poste): boolean {
  return POSTE_LEVEL[candidatePoste] >= POSTE_LEVEL[requiredPoste];
}
