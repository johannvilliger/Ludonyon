"use server";

import { revalidatePath } from "next/cache";
import { query, queryOne } from "@/lib/db";
import { dashboardEstConnecte } from "@/lib/gestion";
import { classerArticles } from "@/lib/classification";

export type ResultatClassement = { classes: number; autre: number };

export async function classerArticlesEdition(): Promise<ResultatClassement> {
  if (!(await dashboardEstConnecte())) throw new Error("Non autorisé.");

  const edition = await queryOne<{ id: string }>("SELECT id FROM editions WHERE active_flag = 1");
  if (!edition) throw new Error("Aucune édition active.");

  const categories = await query<{ id: string; nom: string }>(
    "SELECT id, nom FROM categories WHERE edition_id = ?",
    [edition.id],
  );
  if (categories.length === 0) {
    throw new Error(
      "Aucune catégorie pour cette édition (elle a été créée avant cette fonctionnalité) — applique la migration 0011 puis réessaie.",
    );
  }
  const idParNom = new Map(categories.map((c) => [c.nom, c.id]));

  const articles = await query<{ id: string; nom: string }>(
    `SELECT a.id, a.nom FROM articles a
     JOIN participations p ON p.id = a.participation_id
     WHERE p.edition_id = ? AND a.categorie_id IS NULL`,
    [edition.id],
  );
  if (articles.length === 0) return { classes: 0, autre: 0 };

  const classifications = await classerArticles(articles);

  let classes = 0;
  let autre = 0;
  for (const [articleId, nomCategorie] of classifications) {
    const categorieId = idParNom.get(nomCategorie);
    if (!categorieId) continue;
    await query("UPDATE articles SET categorie_id = ? WHERE id = ?", [categorieId, articleId]);
    classes++;
    if (nomCategorie === "Autre") autre++;
  }

  revalidatePath("/gestion/dashboard/vendeurs");
  return { classes, autre };
}
