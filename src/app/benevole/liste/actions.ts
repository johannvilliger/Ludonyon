"use server";

import { revalidatePath } from "next/cache";
import { query, queryOne } from "@/lib/db";
import { messageMotInterdit, motInterdit } from "@/lib/articles-interdits";
import { benevoleConnecte } from "@/lib/benevole-session";

async function participationActive(vendeurId: string) {
  return queryOne<{ id: string }>(
    `SELECT p.id FROM participations p JOIN editions e ON e.id = p.edition_id WHERE p.vendeur_id = ? AND e.active_flag = 1`,
    [vendeurId],
  );
}

// Pas de plafond de 30 articles ici, comme pour les comptes 9xx gérés
// depuis l'accueil — c'est la même règle, juste en self-service.
export async function ajouterArticleBenevole(nom: string, prix: number) {
  const session = await benevoleConnecte();
  if (!session) throw new Error("Session expirée, reconnectez-vous.");

  const participation = await participationActive(session.vendeurId);
  if (!participation) throw new Error("Aucune édition active pour le moment.");

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

  revalidatePath("/benevole/liste");
}

export async function modifierArticleBenevole(articleId: string, nom: string, prix: number) {
  const session = await benevoleConnecte();
  if (!session) throw new Error("Session expirée, reconnectez-vous.");

  const participation = await participationActive(session.vendeurId);
  if (!participation) throw new Error("Aucune édition active pour le moment.");

  const nomTrim = nom.trim();
  if (!nomTrim) throw new Error("Le nom est obligatoire.");

  const mot = motInterdit(nomTrim);
  if (mot) throw new Error(messageMotInterdit(mot));

  const prixArrondi = Math.round(prix);
  if (!Number.isFinite(prixArrondi) || prixArrondi <= 0) {
    throw new Error("Le prix doit être supérieur à 0.–.");
  }

  // participation_id vérifie que l'article appartient bien au bénévole
  // connecté, et statut = 'non_recu' qu'il n'a pas déjà été réceptionné —
  // au-delà, seul le staff corrige depuis l'accueil.
  await query(
    "UPDATE articles SET nom = ?, prix = ? WHERE id = ? AND participation_id = ? AND statut = 'non_recu'",
    [nomTrim, prixArrondi, articleId, participation.id],
  );

  revalidatePath("/benevole/liste");
}
