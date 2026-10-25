import { type CategorieArticle } from "./categories";

// Catégorie déduite directement du nom de l'article, avant de solliciter
// Claude — gratuit, instantané, et fiable pour les cas évidents (marque
// citée, type d'objet explicite dans le nom). L'ordre compte : la première
// entrée qui matche gagne, donc les marques/termes spécifiques (Lego,
// Playmobil…) passent avant les termes génériques (bois, garage…) pour
// qu'un "Garage Playmobil" tombe en Playmobil, pas en Garages (voitures).
// Un nom qui ne matche rien ici part comme avant à la classification par
// Claude (lib/classification.ts).
const MOTS_CLES_PAR_CATEGORIE: { categorie: CategorieArticle; motsCles: string[] }[] = [
  { categorie: "Lego", motsCles: ["lego", "duplo"] },
  { categorie: "Playmobil", motsCles: ["playmobil"] },
  {
    categorie: "Construction",
    motsCles: ["kapla", "meccano", "k'nex", "knex", "mega bloks", "clics", "construction"],
  },
  { categorie: "Poupées", motsCles: ["poupee", "barbie", "baigneur", "baigneuse"] },
  { categorie: "Garages (voitures)", motsCles: ["garage"] },
  { categorie: "Jouets en bois", motsCles: ["bois"] },
  { categorie: "Jouets 1er âge", motsCles: ["hochet", "tapis d'eveil", "premier age", "1er age"] },
  { categorie: "Puzzle", motsCles: ["puzzle"] },
  { categorie: "Livres", motsCles: ["livre", "bande dessinee"] },
  { categorie: "Sport", motsCles: ["velo", "draisienne", "trottinette", "raquette", "patin"] },
  { categorie: "Puériculture", motsCles: ["poussette", "chaise haute", "siege auto", "trotteur"] },
];

function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

export function trouverCategorieParMotsCles(nom: string): CategorieArticle | null {
  const texte = normaliser(nom);
  if (!texte) return null;

  for (const { categorie, motsCles } of MOTS_CLES_PAR_CATEGORIE) {
    if (motsCles.some((mc) => texte.includes(normaliser(mc)))) {
      return categorie;
    }
  }
  return null;
}
