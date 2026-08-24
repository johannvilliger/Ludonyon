export const CATEGORIES_ARTICLES = [
  "Jeux",
  "Jouets",
  "Puériculture",
  "Puzzle",
  "Livres",
  "Sport",
  "Autre",
] as const;

export type CategorieArticle = (typeof CATEGORIES_ARTICLES)[number];
