export const CATEGORIES_ARTICLES = [
  "Jeux de société",
  "Lego",
  "Construction",
  "Playmobil",
  "Jouets",
  "Garages (voitures)",
  "Jouets en bois",
  "Poupées",
  "Jouets 1er âge",
  "Puériculture",
  "Puzzle",
  "Livres",
  "Sport",
  "Autre",
] as const;

export type CategorieArticle = (typeof CATEGORIES_ARTICLES)[number];
