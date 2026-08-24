"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { messageMotInterdit, motInterdit } from "@/lib/articles-interdits";

export async function definirBenevole(code: string, estBenevole: boolean) {
  await query("UPDATE participations SET est_benevole = ? WHERE code_confirmation = ?", [estBenevole, code]);

  revalidatePath(`/accueil/vendeur/${code}`);
}

export async function marquerControlee(code: string) {
  await query("UPDATE participations SET statut = 'controlee' WHERE code_confirmation = ?", [code]);

  revalidatePath(`/accueil/vendeur/${code}`);
}

export async function basculerRecu(articleId: string, code: string) {
  // On ne touche jamais un article déjà vendu ou invendu — seul le
  // va-et-vient non_recu <-> recu est piloté depuis l'accueil.
  await query(
    "UPDATE articles SET statut = IF(statut = 'non_recu', 'recu', 'non_recu') WHERE id = ? AND statut IN ('non_recu', 'recu')",
    [articleId],
  );

  revalidatePath(`/accueil/vendeur/${code}`);
}

export async function modifierArticle(articleId: string, code: string, nom: string, prix: number) {
  const nomTrim = nom.trim();
  if (!nomTrim) throw new Error("Le nom est obligatoire.");

  const mot = motInterdit(nomTrim);
  if (mot) throw new Error(messageMotInterdit(mot));

  const prixArrondi = Math.round(prix);
  if (!Number.isFinite(prixArrondi) || prixArrondi <= 0) {
    throw new Error("Le prix doit être supérieur à 0.–.");
  }

  // Un article déjà vendu ou invendu est verrouillé — on ne corrige jamais
  // une vente déjà encaissée depuis l'accueil.
  await query("UPDATE articles SET nom = ?, prix = ? WHERE id = ? AND statut IN ('non_recu', 'recu')", [
    nomTrim,
    prixArrondi,
    articleId,
  ]);

  revalidatePath(`/accueil/vendeur/${code}`);
}

export async function terminerReception(code: string) {
  const nonRecu = await queryOne<{ id: string }>(
    `SELECT a.id FROM articles a JOIN participations p ON p.id = a.participation_id
     WHERE p.code_confirmation = ? AND a.statut = 'non_recu' LIMIT 1`,
    [code],
  );
  if (nonRecu) throw new Error("Il reste des articles non reçus.");

  await query("UPDATE participations SET statut = 'validee' WHERE code_confirmation = ?", [code]);
  redirect("/accueil");
}
