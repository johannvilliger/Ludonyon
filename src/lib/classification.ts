import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { CATEGORIES_ARTICLES } from "@/lib/categories";

const MODELE = "claude-haiku-4-5-20251001";
const TAILLE_LOT = 150;

export type ArticleAClasser = { id: string; nom: string };

// Classe une liste d'articles par lots (une seule requête par lot plutôt
// qu'une par article, pour rester rapide et peu coûteux même sur plusieurs
// centaines d'articles). Se base uniquement sur le nom — pas de recherche
// internet réelle, la connaissance générale du modèle suffit largement
// pour ce genre de classification et évite la lenteur/fragilité d'un vrai
// scraping de résultats de recherche.
export async function classerArticles(articles: ArticleAClasser[]): Promise<Map<string, string>> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY n'est pas configurée sur le serveur.");
  }

  const client = new Anthropic();
  const resultat = new Map<string, string>();

  for (let i = 0; i < articles.length; i += TAILLE_LOT) {
    const lot = articles.slice(i, i + TAILLE_LOT);
    const classifications = await classerUnLot(client, lot);
    for (const [id, categorie] of classifications) resultat.set(id, categorie);
  }

  return resultat;
}

async function classerUnLot(client: Anthropic, lot: ArticleAClasser[]): Promise<Map<string, string>> {
  const message = await client.messages.create({
    model: MODELE,
    max_tokens: 4096,
    tools: [
      {
        name: "classer_articles",
        description: "Enregistre la catégorie de chaque article.",
        input_schema: {
          type: "object",
          properties: {
            classifications: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  index: { type: "integer", description: "Le numéro fourni devant cet article dans la liste." },
                  categorie: { type: "string", enum: [...CATEGORIES_ARTICLES] },
                },
                required: ["index", "categorie"],
              },
            },
          },
          required: ["classifications"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "classer_articles" },
    messages: [
      {
        role: "user",
        content:
          `Tu classes des articles déposés pour un troc de ludothèque (jeux/jouets d'occasion). ` +
          `Pour chaque article ci-dessous, choisis la catégorie la plus appropriée parmi : ${CATEGORIES_ARTICLES.join(", ")}. ` +
          `Base-toi uniquement sur le nom fourni. Utilise "Autre" si le nom est ambigu, incompréhensible, ou ne correspond à aucune des autres catégories.\n\n` +
          // Numéro de position plutôt que l'UUID réel de l'article : demander
          // au modèle de recopier un UUID complet pour chacun des (jusqu'à
          // 150) articles d'un lot est fragile — une seule erreur de recopie
          // fait échouer silencieusement l'UPDATE correspondant en base (voir
          // classerArticlesEdition). Un entier court est quasi impossible à
          // mal recopier, et on refait le lien avec le vrai id localement.
          lot.map((a, i) => `${i} — ${a.nom}`).join("\n"),
      },
    ],
  });

  const resultat = new Map<string, string>();
  for (const block of message.content) {
    if (block.type === "tool_use" && block.name === "classer_articles") {
      const input = block.input as { classifications?: { index?: number; categorie: string }[] };
      for (const c of input.classifications ?? []) {
        if (typeof c.index !== "number") continue;
        const article = lot[c.index];
        if (!article) continue; // index hors limites — réponse à ignorer plutôt que planter tout le lot
        if ((CATEGORIES_ARTICLES as readonly string[]).includes(c.categorie)) {
          resultat.set(article.id, c.categorie);
        }
      }
    }
  }
  return resultat;
}
