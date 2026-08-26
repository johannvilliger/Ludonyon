"use server";

import { revalidatePath } from "next/cache";
import { nouvelId, queryOne, withTransaction } from "@/lib/db";
import { messageMotInterdit, motInterdit } from "@/lib/articles-interdits";

export type FormState = { error: string | null; success?: boolean };

type ArticleInput = { nom: string; prix: number };

export async function modifierListeVendeur(
  code: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  let articlesRaw: unknown;
  try {
    articlesRaw = JSON.parse(String(formData.get("articles") ?? "[]"));
  } catch {
    return { error: "Liste d'articles invalide." };
  }

  const articles: ArticleInput[] = (Array.isArray(articlesRaw) ? articlesRaw : [])
    .map((a) => ({
      nom: String((a as ArticleInput)?.nom ?? "").trim(),
      prix: Math.round(Number((a as ArticleInput)?.prix)),
    }))
    .filter((a) => a.nom.length > 0 && Number.isFinite(a.prix));

  if (articles.length === 0) return { error: "Ajoutez au moins un article." };
  if (articles.length > 30) return { error: "30 articles maximum par liste." };

  for (const a of articles) {
    if (a.nom.length < 3) return { error: `Le nom « ${a.nom} » doit contenir au moins 3 caractères.` };
    const mot = motInterdit(a.nom);
    if (mot) return { error: messageMotInterdit(mot) };
    if (a.prix <= 0) return { error: `Indiquez un prix supérieur à 0.– pour « ${a.nom} ».` };
  }

  const participation = await queryOne<{ id: string; phase: string }>(
    `SELECT p.id, e.phase
     FROM participations p JOIN editions e ON e.id = p.edition_id
     WHERE p.code_confirmation = ?`,
    [code],
  );

  if (!participation) return { error: "Liste introuvable." };
  // Vérification côté serveur, pas seulement dans la page : le dépôt a pu
  // se terminer entre le chargement de la page et la soumission.
  if (participation.phase !== "depot") {
    return { error: "La modification n'est plus possible : le dépôt est terminé." };
  }

  try {
    // Aucun article ne peut déjà être reçu/étiqueté/vendu tant que l'édition
    // est en phase "dépôt" — remplacer entièrement la liste est donc sans
    // risque (pas de ligne à préserver ailleurs qui référencerait un id
    // d'article existant).
    await withTransaction(async (conn) => {
      await conn.query("DELETE FROM articles WHERE participation_id = ?", [participation.id]);
      for (const [i, a] of articles.entries()) {
        await conn.query(
          "INSERT INTO articles (id, participation_id, numero_article, nom, prix) VALUES (?, ?, ?, ?, ?)",
          [nouvelId(), participation.id, i + 1, a.nom, a.prix],
        );
      }
    });
  } catch {
    return { error: "Impossible d'enregistrer les modifications, réessayez." };
  }

  revalidatePath(`/vendeur/modifier/${code}`);
  return { error: null, success: true };
}
