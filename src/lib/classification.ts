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
                  id: { type: "string", description: "L'identifiant fourni pour cet article." },
                  categorie: { type: "string", enum: [...CATEGORIES_ARTICLES] },
                },
                required: ["id", "categorie"],
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
          lot.map((a) => `${a.id} — ${a.nom}`).join("\n"),
      },
    ],
  });

  const resultat = new Map<string, string>();
  for (const block of message.content) {
    if (block.type === "tool_use" && block.name === "classer_articles") {
      const input = block.input as { classifications?: { id: string; categorie: string }[] };
      for (const c of input.classifications ?? []) {
        if ((CATEGORIES_ARTICLES as readonly string[]).includes(c.categorie)) {
          resultat.set(c.id, c.categorie);
        }
      }
    }
  }
  return resultat;
}
