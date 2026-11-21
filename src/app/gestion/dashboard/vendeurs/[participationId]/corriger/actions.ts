"use server";

import { revalidatePath } from "next/cache";
import { query, queryOne } from "@/lib/db";
import { dashboardEstConnecte } from "@/lib/gestion";
import { messageMotInterdit, motInterdit } from "@/lib/articles-interdits";
import { LONGUEUR_MAX_NOM } from "@/lib/validation-articles";
import { envoyerMessageCorrection } from "@/lib/email";

// Un article déjà vendu ou invendu est verrouillé — jamais touché depuis
// cet outil de correction, même constat qu'à l'accueil (voir
// accueil/vendeur/[code]/actions.ts) : on ne corrige jamais une vente déjà
// encaissée.
const STATUTS_MODIFIABLES = ["non_recu", "recu", "refuse"];

function validerNomPrix(nom: string, prix: number): { nomTrim: string; prixArrondi: number } {
  const nomTrim = nom.trim();
  if (!nomTrim) throw new Error("Le nom est obligatoire.");
  if (nomTrim.length > LONGUEUR_MAX_NOM) {
    throw new Error(`Le nom dépasse ${LONGUEUR_MAX_NOM} caractères (il doit tenir sur l'étiquette).`);
  }
  const mot = motInterdit(nomTrim);
  if (mot) throw new Error(messageMotInterdit(mot));
  const prixArrondi = Math.round(prix);
  if (!Number.isFinite(prixArrondi) || prixArrondi <= 0) throw new Error("Le prix doit être supérieur à 0.–.");
  return { nomTrim, prixArrondi };
}

export async function modifierArticleDashboard(articleId: string, participationId: string, nom: string, prix: number) {
  if (!(await dashboardEstConnecte())) throw new Error("Non autorisé.");

  const article = await queryOne<{ statut: string }>("SELECT statut FROM articles WHERE id = ?", [articleId]);
  if (!article) throw new Error("Article introuvable.");
  if (!STATUTS_MODIFIABLES.includes(article.statut)) {
    throw new Error("Impossible de modifier un article déjà vendu ou invendu.");
  }

  const { nomTrim, prixArrondi } = validerNomPrix(nom, prix);
  await query("UPDATE articles SET nom = ?, prix = ? WHERE id = ?", [nomTrim, prixArrondi, articleId]);
  revalidatePath(`/gestion/dashboard/vendeurs/${participationId}/corriger`);
}

// Supprime un article (ex. article test déposé par erreur) — même garde
// que modifierArticleDashboard : jamais touché une fois vendu ou invendu.
export async function supprimerArticleDashboard(articleId: string, participationId: string) {
  if (!(await dashboardEstConnecte())) throw new Error("Non autorisé.");

  const article = await queryOne<{ statut: string }>("SELECT statut FROM articles WHERE id = ?", [articleId]);
  if (!article) throw new Error("Article introuvable.");
  if (!STATUTS_MODIFIABLES.includes(article.statut)) {
    throw new Error("Impossible de supprimer un article déjà vendu ou invendu.");
  }

  await query("DELETE FROM articles WHERE id = ?", [articleId]);
  revalidatePath(`/gestion/dashboard/vendeurs/${participationId}/corriger`);
}

// Simple recherche par numéro, pour afficher une confirmation ("Déplacer
// vers Vendeur #4 — Akgul ?") avant d'agir — jamais de déplacement direct
// à l'aveugle sur un numéro tapé au clavier.
export async function rechercherVendeurParNumero(editionId: string, numeroVendeur: number) {
  if (!(await dashboardEstConnecte())) throw new Error("Non autorisé.");

  return queryOne<{ id: string; numero_vendeur: number; nom_vendeur: string }>(
    `SELECT p.id, p.numero_vendeur, v.nom AS nom_vendeur
     FROM participations p JOIN vendeurs v ON v.id = p.vendeur_id
     WHERE p.edition_id = ? AND p.numero_vendeur = ?`,
    [editionId, numeroVendeur],
  );
}

// Déplace un article d'une liste à l'autre (deux listes créées par erreur
// par le même client, article mal classé...) — garde son nom/prix/statut,
// reçoit juste un nouveau n° dans la liste d'arrivée.
export async function deplacerArticle(
  articleId: string,
  participationIdSource: string,
  editionId: string,
  numeroVendeurCible: number,
) {
  if (!(await dashboardEstConnecte())) throw new Error("Non autorisé.");

  const cible = await queryOne<{ id: string }>(
    "SELECT p.id FROM participations p WHERE p.edition_id = ? AND p.numero_vendeur = ?",
    [editionId, numeroVendeurCible],
  );
  if (!cible) throw new Error(`Aucun vendeur n° ${numeroVendeurCible} dans cette édition.`);
  if (cible.id === participationIdSource) throw new Error("C'est déjà la liste de cet article.");

  const article = await queryOne<{ statut: string }>("SELECT statut FROM articles WHERE id = ?", [articleId]);
  if (!article) throw new Error("Article introuvable.");
  if (!STATUTS_MODIFIABLES.includes(article.statut)) {
    throw new Error("Impossible de déplacer un article déjà vendu ou invendu.");
  }

  const suivant = await queryOne<{ suivant: number }>(
    "SELECT COALESCE(MAX(numero_article), 0) + 1 AS suivant FROM articles WHERE participation_id = ?",
    [cible.id],
  );

  await query("UPDATE articles SET participation_id = ?, numero_article = ? WHERE id = ?", [
    cible.id,
    suivant?.suivant ?? 1,
    articleId,
  ]);

  revalidatePath(`/gestion/dashboard/vendeurs/${participationIdSource}/corriger`);
}

// Correction de clôture : un objet marqué invendu mais retrouvé manquant au
// contrôle physique (vendu sans avoir été scanné à la caisse). Jamais une
// vraie vente (pas de ligne vente_articles) — juste un crédit manuel au
// vendeur. vendu_manuellement (migration 0040) distingue ce cas d'une
// vraie vente encaissée et permet d'annuler la correction proprement.
export async function marquerVenduManuellement(articleId: string, participationId: string, note: string) {
  if (!(await dashboardEstConnecte())) throw new Error("Non autorisé.");

  const noteTrim = note.trim();
  if (!noteTrim) throw new Error("Une note est obligatoire pour une correction manuelle.");

  const article = await queryOne<{ statut: string }>("SELECT statut FROM articles WHERE id = ?", [articleId]);
  if (!article) throw new Error("Article introuvable.");
  if (article.statut !== "invendu") {
    throw new Error("Seul un article marqué invendu peut être corrigé en vendu manuellement.");
  }

  await query("UPDATE articles SET statut = 'vendu', vendu_manuellement = 1, note_correction = ? WHERE id = ?", [
    noteTrim,
    articleId,
  ]);

  revalidatePath(`/gestion/dashboard/vendeurs/${participationId}/corriger`);
}

// Annule une correction manuelle (reclic, erreur) — vendu_manuellement = 1
// garantit qu'aucune ligne vente_articles n'existe derrière, donc rien à
// annuler côté caisse : un simple retour à invendu suffit.
export async function annulerCorrectionManuelle(articleId: string, participationId: string) {
  if (!(await dashboardEstConnecte())) throw new Error("Non autorisé.");

  const article = await queryOne<{ vendu_manuellement: number }>(
    "SELECT vendu_manuellement FROM articles WHERE id = ?",
    [articleId],
  );
  if (!article) throw new Error("Article introuvable.");
  if (!article.vendu_manuellement) {
    throw new Error("Cet article n'est pas une correction manuelle — rien à annuler ici.");
  }

  await query("UPDATE articles SET statut = 'invendu', vendu_manuellement = 0, note_correction = NULL WHERE id = ?", [
    articleId,
  ]);

  revalidatePath(`/gestion/dashboard/vendeurs/${participationId}/corriger`);
}

export async function envoyerMessageVendeurAction(participationId: string, message: string) {
  if (!(await dashboardEstConnecte())) throw new Error("Non autorisé.");

  const messageTrim = message.trim();
  if (!messageTrim) throw new Error("Le message est vide.");

  const participation = await queryOne<{ numero_vendeur: number; email: string | null }>(
    `SELECT p.numero_vendeur, v.email FROM participations p JOIN vendeurs v ON v.id = p.vendeur_id WHERE p.id = ?`,
    [participationId],
  );
  if (!participation) throw new Error("Vendeur introuvable.");
  if (!participation.email) throw new Error("Ce vendeur n'a pas d'adresse email enregistrée.");

  const envoye = await envoyerMessageCorrection({
    destinataire: participation.email,
    numeroVendeur: participation.numero_vendeur,
    message: messageTrim,
  });
  if (!envoye) throw new Error("Échec de l'envoi — vérifiez la configuration SMTP (voir logs serveur).");
}
