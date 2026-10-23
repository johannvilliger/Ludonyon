"use server";

import { revalidatePath } from "next/cache";
import { query, queryOne } from "@/lib/db";
import { dashboardEstConnecte } from "@/lib/gestion";
import { CATEGORIES_ARTICLES } from "@/lib/categories";

export type ActionState = { error: string | null };

// Reclassement manuel d'un article — complète le classement automatique
// (voir lib/classification.ts) pour corriger un article mal classé ou
// encore en "Autre". "" remet l'article sans catégorie.
export async function changerCategorieArticle(articleId: string, nomCategorie: string): Promise<ActionState> {
  if (!(await dashboardEstConnecte())) throw new Error("Non autorisé.");

  if (nomCategorie === "") {
    await query("UPDATE articles SET categorie_id = NULL WHERE id = ?", [articleId]);
    revalidatePath("/gestion/dashboard/articles");
    return { error: null };
  }

  if (!(CATEGORIES_ARTICLES as readonly string[]).includes(nomCategorie)) {
    return { error: "Catégorie inconnue." };
  }

  const article = await queryOne<{ edition_id: string }>(
    "SELECT p.edition_id FROM articles a JOIN participations p ON p.id = a.participation_id WHERE a.id = ?",
    [articleId],
  );
  if (!article) return { error: "Article introuvable." };

  const categorie = await queryOne<{ id: string }>("SELECT id FROM categories WHERE edition_id = ? AND nom = ?", [
    article.edition_id,
    nomCategorie,
  ]);
  if (!categorie) return { error: "Catégorie introuvable pour cette édition." };

  await query("UPDATE articles SET categorie_id = ? WHERE id = ?", [categorie.id, articleId]);

  revalidatePath("/gestion/dashboard/articles");
  return { error: null };
}
