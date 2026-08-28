"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { messageMotInterdit, motInterdit } from "@/lib/articles-interdits";
import { accueilEstConnecte } from "@/lib/gestion";

export async function definirBenevole(code: string, estBenevole: boolean) {
  if (!(await accueilEstConnecte())) throw new Error("Non autorisé.");

  await query("UPDATE participations SET est_benevole = ? WHERE code_confirmation = ?", [estBenevole, code]);

  revalidatePath(`/accueil/vendeur/${code}`);
}

export async function marquerControlee(code: string) {
  if (!(await accueilEstConnecte())) throw new Error("Non autorisé.");

  await query("UPDATE participations SET statut = 'controlee' WHERE code_confirmation = ?", [code]);

  revalidatePath(`/accueil/vendeur/${code}`);
}

export async function accepterArticle(articleId: string, code: string) {
  if (!(await accueilEstConnecte())) throw new Error("Non autorisé.");

  // On ne touche jamais un article déjà vendu ou invendu — accepter/refuser
  // ne concerne que la réception, avant la mise en vente.
  await query(
    "UPDATE articles SET statut = 'recu' WHERE id = ? AND statut IN ('non_recu', 'recu', 'refuse')",
    [articleId],
  );

  revalidatePath(`/accueil/vendeur/${code}`);
}

export async function refuserArticle(articleId: string, code: string) {
  if (!(await accueilEstConnecte())) throw new Error("Non autorisé.");

  // Article repris par le vendeur (mauvais état / sale / cassé) : jamais
  // mis en vente. Statut terminal distinct de « invendu ».
  await query(
    "UPDATE articles SET statut = 'refuse' WHERE id = ? AND statut IN ('non_recu', 'recu', 'refuse')",
    [articleId],
  );

  revalidatePath(`/accueil/vendeur/${code}`);
}

export async function modifierArticle(articleId: string, code: string, nom: string, prix: number) {
  if (!(await accueilEstConnecte())) throw new Error("Non autorisé.");

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
  await query("UPDATE articles SET nom = ?, prix = ? WHERE id = ? AND statut IN ('non_recu', 'recu', 'refuse')", [
    nomTrim,
    prixArrondi,
    articleId,
  ]);

  revalidatePath(`/accueil/vendeur/${code}`);
}

// Pas de plafond de 30 articles ici, contrairement au dépôt normal : permet
// à l'accueil de rattraper un article oublié par le vendeur sans lui faire
// refaire toute sa liste, même si elle est déjà à 30. Les étiquettes sont
// imprimées par le staff (jamais par le vendeur), à partir de la liste en
// base au moment de l'impression — un article ajouté ici a donc son
// étiquette dès le prochain passage sur /accueil/vendeur/[code]/etiquettes.
export async function ajouterArticle(code: string, nom: string, prix: number) {
  if (!(await accueilEstConnecte())) throw new Error("Non autorisé.");

  const participation = await queryOne<{ id: string }>(
    "SELECT id FROM participations WHERE code_confirmation = ?",
    [code],
  );
  if (!participation) throw new Error("Vendeur introuvable.");

  const nomTrim = nom.trim();
  if (!nomTrim) throw new Error("Le nom est obligatoire.");

  const mot = motInterdit(nomTrim);
  if (mot) throw new Error(messageMotInterdit(mot));

  const prixArrondi = Math.round(prix);
  if (!Number.isFinite(prixArrondi) || prixArrondi <= 0) {
    throw new Error("Le prix doit être supérieur à 0.–.");
  }

  const dernier = await queryOne<{ suivant: number }>(
    "SELECT COALESCE(MAX(numero_article), 0) + 1 AS suivant FROM articles WHERE participation_id = ?",
    [participation.id],
  );

  await query("INSERT INTO articles (id, participation_id, numero_article, nom, prix) VALUES (UUID(), ?, ?, ?, ?)", [
    participation.id,
    dernier?.suivant ?? 1,
    nomTrim,
    prixArrondi,
  ]);

  revalidatePath(`/accueil/vendeur/${code}`);
}

export async function terminerReception(code: string) {
  if (!(await accueilEstConnecte())) throw new Error("Non autorisé.");

  const nonRecu = await queryOne<{ id: string }>(
    `SELECT a.id FROM articles a JOIN participations p ON p.id = a.participation_id
     WHERE p.code_confirmation = ? AND a.statut = 'non_recu' LIMIT 1`,
    [code],
  );
  if (nonRecu) throw new Error("Il reste des articles non reçus.");

  await query("UPDATE participations SET statut = 'validee' WHERE code_confirmation = ?", [code]);
  redirect("/accueil");
}
