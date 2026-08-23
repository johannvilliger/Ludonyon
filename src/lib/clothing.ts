// Tailles et coupes du polo et du pull de la ludothèque, remis à certain·e·s
// bénévoles. Taille/coupe restent modifiables même sans l'avoir reçu, pour
// savoir lequel donner directement le jour où on en prête ou en remet un.
export const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
export type ClothingSize = (typeof CLOTHING_SIZES)[number];

export const CLOTHING_CUTS = ["HOMME", "FEMME"] as const;
export type ClothingCut = (typeof CLOTHING_CUTS)[number];

export const CLOTHING_CUT_LABELS: Record<ClothingCut, string> = {
  HOMME: "Homme",
  FEMME: "Femme",
};

export function isValidClothingSize(value: string): value is ClothingSize {
  return (CLOTHING_SIZES as readonly string[]).includes(value);
}

export function isValidClothingCut(value: string): value is ClothingCut {
  return (CLOTHING_CUTS as readonly string[]).includes(value);
}
