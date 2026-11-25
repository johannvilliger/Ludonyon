"use server";

import { revalidatePath } from "next/cache";
import { nouvelId, query, queryOne, withTransaction } from "@/lib/db";
import { dashboardEstConnecte } from "@/lib/gestion";
import { classerArticles } from "@/lib/classification";
import type { CaseEtiquette, ContenuEtiquettesArticles } from "@/lib/etiquettes-articles-impression";
import { estVendeurSpecial } from "@/lib/vendeurs-speciaux";

export type ResultatClassement = { classes: number; autre: number };

async function classerArticlesDeLEdition(filtrerNonClasses: boolean): Promise<ResultatClassement> {
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
     WHERE p.edition_id = ?${filtrerNonClasses ? " AND a.categorie_id IS NULL" : ""}`,
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
  revalidatePath("/gestion/dashboard/articles");
  return { classes, autre };
}

// Classe uniquement les articles pas encore catégorisés — sûr à relancer
// n'importe quand, ne touche jamais une catégorie déjà posée (automatique
// ou corrigée manuellement depuis /gestion/dashboard/articles).
export async function classerArticlesEdition(): Promise<ResultatClassement> {
  return classerArticlesDeLEdition(true);
}

// Reclasse TOUS les articles de l'édition, y compris ceux déjà catégorisés
// — écrase donc aussi d'éventuelles corrections manuelles. Pensé pour un
// usage ponctuel (ex. après un changement de la liste des catégories), pas
// en routine — voir ReclasserButton.
export async function reclasserTousLesArticlesEdition(): Promise<ResultatClassement> {
  return classerArticlesDeLEdition(false);
}

type ParticipationPlage = { id: string; numero_vendeur: number; nom_vendeur: string; telephone: string | null };
type ArticlePlage = { participation_id: string; numero_article: number; nom: string; prix: number };

export type ResultatEnvoiPlage =
  | { ok: true; nbFeuilles: number; nbVendeursSansArticle: number }
  | { ok: false; error: string };

// Même contenu que l'envoi un par un depuis la fiche vendeur (voir
// accueil/vendeur/[code]/etiquettes/actions.ts) — une étiquette normale par
// article non refusé, pas de copie ni de "texte seul" supplémentaire (ça,
// c'est au cas par cas depuis la fiche vendeur). Pensé pour envoyer tout un
// lot d'un coup (plage de numéros) à la file d'attente print-agent plutôt
// que vendeur par vendeur.
export async function envoyerEtiquettesPlage(numeroDebut: number, numeroFin: number): Promise<ResultatEnvoiPlage> {
  if (!(await dashboardEstConnecte())) throw new Error("Non autorisé.");

  if (!Number.isInteger(numeroDebut) || !Number.isInteger(numeroFin) || numeroDebut < 1 || numeroFin < numeroDebut) {
    return { ok: false, error: "Plage invalide : entrez deux numéros de vendeur (début ≤ fin)." };
  }

  const edition = await queryOne<{ id: string; taux_achat: number }>(
    "SELECT id, taux_achat FROM editions WHERE active_flag = 1",
  );
  if (!edition) return { ok: false, error: "Aucune édition active." };

  const participations = await query<ParticipationPlage>(
    `SELECT p.id, p.numero_vendeur, v.nom AS nom_vendeur, v.telephone
     FROM participations p
     JOIN vendeurs v ON v.id = p.vendeur_id
     WHERE p.edition_id = ? AND p.numero_vendeur BETWEEN ? AND ? AND p.absent = 0
     ORDER BY p.numero_vendeur`,
    [edition.id, numeroDebut, numeroFin],
  );
  if (participations.length === 0) {
    return { ok: false, error: "Aucun vendeur dans cette plage pour l'édition active." };
  }

  const placeholders = participations.map(() => "?").join(", ");
  const articles = await query<ArticlePlage>(
    `SELECT participation_id, numero_article, nom, prix FROM articles
     WHERE participation_id IN (${placeholders}) AND statut != 'refuse'
     ORDER BY numero_article`,
    participations.map((p) => p.id),
  );

  const articlesParParticipation = new Map<string, ArticlePlage[]>();
  for (const a of articles) {
    const liste = articlesParParticipation.get(a.participation_id) ?? [];
    liste.push(a);
    articlesParParticipation.set(a.participation_id, liste);
  }

  let nbFeuilles = 0;
  let nbVendeursSansArticle = 0;

  await withTransaction(async (conn) => {
    for (const p of participations) {
      const liste = articlesParParticipation.get(p.id) ?? [];
      if (liste.length === 0) {
        nbVendeursSansArticle++;
        continue;
      }

      const cases: CaseEtiquette[] = liste.map((a) => ({
        type: "normal",
        numeroArticle: a.numero_article,
        nom: a.nom,
        prix: a.prix,
      }));
      const contenu: ContenuEtiquettesArticles = {
        numeroVendeur: p.numero_vendeur,
        nomVendeur: p.nom_vendeur,
        telephone: p.telephone,
        special: estVendeurSpecial(p.numero_vendeur),
        tauxAchat: Number(edition.taux_achat),
        cases,
      };

      await conn.query(
        "INSERT INTO etiquettes_articles_impression (id, participation_id, numero_vendeur, contenu_json) VALUES (?, ?, ?, ?)",
        [nouvelId(), p.id, p.numero_vendeur, JSON.stringify(contenu)],
      );
      nbFeuilles++;
    }
  });

  revalidatePath("/gestion/dashboard");
  revalidatePath("/gestion/dashboard/vendeurs");
  return { ok: true, nbFeuilles, nbVendeursSansArticle };
}
