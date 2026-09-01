// Fréquence de disponibilité pour le planning des ouvertures — utilisée
// par la répartition automatique (voir OPENING_FREQUENCY_MONTHLY_CAP dans
// autoSchedule.ts) comme plafond mensuel indicatif.
export const OPENING_FREQUENCIES = ["1X_SEMAINE", "2X_SEMAINE", "1X_MOIS", "2X_MOIS"] as const;
export type OpeningFrequency = (typeof OPENING_FREQUENCIES)[number];

export const OPENING_FREQUENCY_LABELS: Record<OpeningFrequency, string> = {
  "1X_SEMAINE": "1x par semaine",
  "2X_SEMAINE": "2x par semaine",
  "1X_MOIS": "1x par mois",
  "2X_MOIS": "2x par mois",
};

export function isValidOpeningFrequency(value: string): value is OpeningFrequency {
  return (OPENING_FREQUENCIES as readonly string[]).includes(value);
}

// Disponibilité aux animations (weekend / semaine) — purement informatif,
// n'influence pas la répartition automatique.
export const ANIM_FREQUENCIES = [
  "PAS_INTERESSE",
  "1X_MOIS",
  "1X_TRIMESTRE",
  "1X_SEMESTRE",
  "1X_AN",
] as const;
export type AnimFrequency = (typeof ANIM_FREQUENCIES)[number];

export const ANIM_FREQUENCY_LABELS: Record<AnimFrequency, string> = {
  PAS_INTERESSE: "Pas intéressé·e",
  "1X_MOIS": "1x par mois",
  "1X_TRIMESTRE": "1x par trimestre",
  "1X_SEMESTRE": "1x par semestre",
  "1X_AN": "1x par an",
};

export function isValidAnimFrequency(value: string): value is AnimFrequency {
  return (ANIM_FREQUENCIES as readonly string[]).includes(value);
}
