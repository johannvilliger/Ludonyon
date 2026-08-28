"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { arrondiCentimes } from "@/lib/argent";
import { nouvelId, query, queryOne, withTransaction } from "@/lib/db";
import { envoyerQuittanceAchat } from "@/lib/email";
import { COOKIE_CAISSE } from "@/lib/gestion";
import { estVendeurSpecial } from "@/lib/vendeurs-speciaux";

export type ArticleTrouve = {
  articleId: string;
  numeroVendeur: number;
  numeroArticle: number;
  nomVendeur: string;
  nom: string;
  prix: number;
  estBenevole: boolean;
};

export type RechercheResult = { ok: true; article: ArticleTrouve } | { ok: false; error: string };

async function nomCaisse(caisseId: string): Promise<string> {
  const caisse = await queryOne<{ numero: number }>(
    `SELECT pc.numero FROM caisses c JOIN postes_caisse pc ON pc.id = c.poste_caisse_id WHERE c.id = ?`,
    [caisseId],
  );
  return caisse ? `n° ${caisse.numero}` : "inconnue";
}

export async function rechercherArticle(editionId: string, codeBrut: string, caisseId: string): Promise<RechercheResult> {
  const match = codeBrut.trim().match(/^(\d+)-(\d+)-(\d+)$/);
  if (!match) return { ok: false, error: `Code illisible : « ${codeBrut} »` };

  const numeroVendeur = Number(match[1]);
  const numeroArticle = Number(match[2]);
  const prixScanne = Number(match[3]);

  const participation = await queryOne<{ id: string; est_benevole: number; nom_vendeur: string }>(
    `SELECT p.id, p.est_benevole, v.nom AS nom_vendeur
     FROM participations p
     JOIN vendeurs v ON v.id = p.vendeur_id
     WHERE p.edition_id = ? AND p.numero_vendeur = ?`,
    [editionId, numeroVendeur],
  );

  if (!participation) return { ok: false, error: `Vendeur n° ${numeroVendeur} introuvable.` };

  const article = await queryOne<{ id: string; numero_article: number; nom: string; prix: number; statut: string }>(
    "SELECT id, numero_article, nom, prix, statut FROM articles WHERE participation_id = ? AND numero_article = ?",
    [participation.id, numeroArticle],
  );

  if (!article) {
    return { ok: false, error: `Article n° ${numeroArticle} introuvable pour le vendeur ${numeroVendeur}.` };
  }

  if (article.prix !== prixScanne) {
    return {
      ok: false,
      error: `Prix incohérent sur « ${article.nom} » : étiquette ${prixScanne}.– mais liste ${article.prix}.– — vérifiez l'objet avant d'encaisser.`,
    };
  }

  // articles.statut est la source de vérité pour "actuellement vendu ?" —
  // un article remboursé repasse à 'recu' et redevient donc scannable, sans
  // que sa ligne vente_articles d'origine (conservée pour l'historique de
  // la caisse de vente d'origine) n'entre en compte ici.
  if (article.statut === "vendu") {
    return { ok: false, error: `« ${article.nom} » (vendeur n° ${numeroVendeur}) a déjà été vendu.` };
  }

  // Réservation exclusive de l'article pour cette caisse : purge d'abord les
  // réservations trop anciennes (caissier qui a scanné puis rechargé sans
  // vider son panier), puis tente la réservation elle-même. La clé primaire
  // sur article_id fait respecter l'exclusivité au niveau de la base, pas
  // par une simple vérification applicative sujette aux courses.
  await query("DELETE FROM articles_reserves WHERE article_id = ? AND reserve_le < (NOW() - INTERVAL 10 MINUTE)", [
    article.id,
  ]);

  try {
    await query("INSERT INTO articles_reserves (article_id, caisse_id) VALUES (?, ?)", [article.id, caisseId]);
  } catch (err) {
    const mysqlErr = err as { code?: string };
    if (mysqlErr.code !== "ER_DUP_ENTRY") throw err;

    const reservation = await queryOne<{ caisse_id: string }>(
      "SELECT caisse_id FROM articles_reserves WHERE article_id = ?",
      [article.id],
    );

    if (reservation && reservation.caisse_id !== caisseId) {
      const autreCaisse = await nomCaisse(reservation.caisse_id);
      return {
        ok: false,
        error: `« ${article.nom} » (vendeur n° ${numeroVendeur}) est déjà dans le panier de la caisse ${autreCaisse} — un seul panier à la fois.`,
      };
    }
    // Sinon : déjà réservé par cette caisse elle-même (rescan), rien à faire.
  }

  return {
    ok: true,
    article: {
      articleId: article.id,
      numeroVendeur,
      numeroArticle: article.numero_article,
      nomVendeur: participation.nom_vendeur,
      nom: article.nom,
      prix: article.prix,
      estBenevole: Boolean(participation.est_benevole),
    },
  };
}

async function articlesDejaVendus(
  articleIds: string[],
): Promise<{ id: string; nom: string; numero_vendeur: number }[]> {
  if (articleIds.length === 0) return [];
  const placeholders = articleIds.map(() => "?").join(", ");
  return query<{ id: string; nom: string; numero_vendeur: number }>(
    `SELECT a.id, a.nom, p.numero_vendeur
     FROM articles a
     JOIN participations p ON p.id = a.participation_id
     WHERE a.id IN (${placeholders}) AND a.statut = 'vendu'`,
    articleIds,
  );
}

function messageArticlesDejaVendus(articles: { nom: string; numero_vendeur: number }[]): string {
  const pluriel = articles.length > 1;
  const noms = articles.map((a) => `« ${a.nom} » (vendeur n° ${a.numero_vendeur})`).join(", ");
  return `${pluriel ? "Ces articles ont" : "Cet article a"} déjà été vendu : ${noms} — retirez-${
    pluriel ? "les" : "le"
  } du panier et réessayez.`;
}

// Envoie une quittance précise (indépendamment de son statut actuel, donc
// réutilisable aussi pour un renvoi manuel depuis le dashboard) et met à
// jour son statut. Ne lève jamais — une quittance ratée ne doit jamais faire
// planter la vente qui l'a demandée ni la clôture de caisse qui la purge.
export async function envoyerUneQuittance(quittanceId: string): Promise<void> {
  const quittance = await queryOne<{
    id: string;
    vente_id: string;
    email: string;
    numero: number;
    vente_created_at: string;
  }>(
    `SELECT q.id, q.vente_id, q.email, pc.numero, v.created_at AS vente_created_at
     FROM quittances q
     JOIN ventes v ON v.id = q.vente_id
     JOIN caisses c ON c.id = v.caisse_id
     JOIN postes_caisse pc ON pc.id = c.poste_caisse_id
     WHERE q.id = ?`,
    [quittanceId],
  );
  if (!quittance) return;

  const lignes = await query<{ nom: string; numero_vendeur: number; prix_encaisse: number }>(
    `SELECT a.nom, p.numero_vendeur, va.prix_encaisse
     FROM vente_articles va
     JOIN articles a ON a.id = va.article_id
     JOIN participations p ON p.id = a.participation_id
     WHERE va.vente_id = ?`,
    [quittance.vente_id],
  );
  const total = arrondiCentimes(lignes.reduce((sum, l) => sum + Number(l.prix_encaisse), 0));

  let envoyee = false;
  try {
    envoyee = await envoyerQuittanceAchat({
      destinataire: quittance.email,
      numeroCaisse: quittance.numero,
      dateVente: new Date(quittance.vente_created_at.replace(" ", "T")),
      articles: lignes.map((l) => ({
        nom: l.nom,
        numeroVendeur: l.numero_vendeur,
        prixEncaisse: Number(l.prix_encaisse),
      })),
      total,
    });
  } catch {
    envoyee = false;
  }

  await query("UPDATE quittances SET statut = ?, envoyee_le = NOW() WHERE id = ?", [
    envoyee ? "envoyee" : "echec",
    quittanceId,
  ]);
}

// Envoie toutes les quittances encore en_attente d'une caisse — appelé juste
// avant d'encaisser une nouvelle vente (elles ne peuvent alors plus
// concerner "la dernière vente" de la caisse, donc plus jamais être annulées
// silencieusement après coup) et à la clôture de caisse (dernier filet).
async function flusherQuittancesEnAttente(caisseId: string): Promise<void> {
  const enAttente = await query<{ id: string }>("SELECT id FROM quittances WHERE caisse_id = ? AND statut = 'en_attente'", [
    caisseId,
  ]);
  for (const q of enAttente) {
    await envoyerUneQuittance(q.id);
  }
}

export type EncaissementResult =
  | { ok: true; total: number; quittanceEnregistree: boolean }
  | { ok: false; error: string };

export async function encaisserPanier(
  caisseId: string,
  editionId: string,
  acheteurBenevole: boolean,
  articleIds: string[],
  emailQuittance: string | null,
): Promise<EncaissementResult> {
  if (articleIds.length === 0) return { ok: false, error: "Le panier est vide." };

  // Avant d'encaisser une nouvelle vente : toute quittance encore en attente
  // sur cette caisse concerne forcément une vente plus ancienne — elle peut
  // donc être envoyée sans risque qu'on l'annule après coup (voir
  // annulerDerniereVente, qui ne cible jamais que LA dernière vente).
  await flusherQuittancesEnAttente(caisseId).catch(() => {});

  const edition = await queryOne<{ taux_achat: number }>("SELECT taux_achat FROM editions WHERE id = ?", [editionId]);
  if (!edition) return { ok: false, error: "Édition introuvable." };

  const placeholders = articleIds.map(() => "?").join(", ");
  const articles = await query<{ id: string; prix: number; numero_vendeur: number }>(
    `SELECT a.id, a.prix, p.numero_vendeur
     FROM articles a JOIN participations p ON p.id = a.participation_id
     WHERE a.id IN (${placeholders})`,
    articleIds,
  );

  if (articles.length !== articleIds.length) {
    return { ok: false, error: "Un des articles du panier n'existe plus." };
  }

  const vendus = await articlesDejaVendus(articleIds);
  if (vendus.length > 0) {
    return { ok: false, error: messageArticlesDejaVendus(vendus) };
  }

  const venteId = nouvelId();
  const lignes = articles.map((a) => {
    const gratuit = acheteurBenevole && estVendeurSpecial(a.numero_vendeur);
    return {
      id: nouvelId(),
      article_id: a.id,
      prix_encaisse: gratuit ? 0 : acheteurBenevole ? a.prix : arrondiCentimes(a.prix * (1 + Number(edition.taux_achat))),
    };
  });

  try {
    await withTransaction(async (conn) => {
      await conn.query("INSERT INTO ventes (id, edition_id, caisse_id, acheteur_benevole) VALUES (?, ?, ?, ?)", [
        venteId,
        editionId,
        caisseId,
        acheteurBenevole,
      ]);

      for (const ligne of lignes) {
        // article_id_libre = article_id à la vente : c'est cette colonne
        // (unique) qui empêche la double-vente d'un même article, y compris
        // en cas de course entre deux caisses (voir la gestion de
        // ER_DUP_ENTRY plus bas). Elle repasse à NULL au remboursement pour
        // libérer l'article, sans jamais toucher à cette ligne d'origine.
        await conn.query(
          "INSERT INTO vente_articles (id, vente_id, article_id, article_id_libre, prix_encaisse) VALUES (?, ?, ?, ?, ?)",
          [ligne.id, venteId, ligne.article_id, ligne.article_id, ligne.prix_encaisse],
        );
      }

      await conn.query(`UPDATE articles SET statut = 'vendu' WHERE id IN (${placeholders})`, articleIds);
      await conn.query(`DELETE FROM articles_reserves WHERE article_id IN (${placeholders})`, articleIds);
    });
  } catch (err) {
    const mysqlErr = err as { code?: string };
    if (mysqlErr.code === "ER_DUP_ENTRY") {
      const vendusEntreTemps = await articlesDejaVendus(articleIds);
      return {
        ok: false,
        error:
          vendusEntreTemps.length > 0
            ? messageArticlesDejaVendus(vendusEntreTemps)
            : "Un des articles vient d'être vendu depuis une autre caisse entre-temps — retirez-le du panier et réessayez.",
      };
    }
    return { ok: false, error: "Impossible d'encaisser, réessayez." };
  }

  let quittanceEnregistree = true;
  if (emailQuittance) {
    // En_attente volontairement : voir flusherQuittancesEnAttente — envoyée
    // seulement à la vente suivante sur cette caisse ou à sa clôture, jamais
    // immédiatement, pour ne jamais envoyer un ticket pour une vente encore
    // annulable. La vente elle-même est déjà actée à ce stade (transaction
    // commitée juste avant) — un raté ici ne doit jamais la remettre en
    // cause, juste être signalé pour que la caissière puisse redemander.
    try {
      await query("INSERT INTO quittances (id, vente_id, caisse_id, email) VALUES (?, ?, ?, ?)", [
        nouvelId(),
        venteId,
        caisseId,
        emailQuittance,
      ]);
    } catch {
      quittanceEnregistree = false;
    }
  }

  const total = arrondiCentimes(lignes.reduce((sum, l) => sum + l.prix_encaisse, 0));
  return { ok: true, total, quittanceEnregistree };
}

export type DerniereVente = {
  total: number;
  articles: { nom: string; numeroVendeur: number }[];
  quittanceEnAttente: boolean;
};

// La vente la plus récente de CETTE caisse (peu importe quand — pas de
// limite de temps), pour permettre de l'annuler en cas d'erreur de scan.
// Toujours recalculée depuis la base plutôt que gardée en mémoire côté
// client : reste correcte même après un rechargement de page.
export async function obtenirDerniereVente(caisseId: string): Promise<DerniereVente | null> {
  const vente = await queryOne<{ id: string }>(
    "SELECT id FROM ventes WHERE caisse_id = ? ORDER BY created_at DESC LIMIT 1",
    [caisseId],
  );
  if (!vente) return null;

  const lignes = await query<{ nom: string; numero_vendeur: number; prix_encaisse: number }>(
    `SELECT a.nom, p.numero_vendeur, va.prix_encaisse
     FROM vente_articles va
     JOIN articles a ON a.id = va.article_id
     JOIN participations p ON p.id = a.participation_id
     WHERE va.vente_id = ?`,
    [vente.id],
  );

  const quittance = await queryOne<{ id: string }>(
    "SELECT id FROM quittances WHERE vente_id = ? AND statut = 'en_attente'",
    [vente.id],
  );

  return {
    total: arrondiCentimes(lignes.reduce((sum, l) => sum + Number(l.prix_encaisse), 0)),
    articles: lignes.map((l) => ({ nom: l.nom, numeroVendeur: l.numero_vendeur })),
    quittanceEnAttente: Boolean(quittance),
  };
}

// Annule la dernière vente de cette caisse : remet les articles au statut
// qu'ils avaient avant la vente ('recu', le seul état possible avant un
// encaissement dans le flux actuel) pour qu'ils redeviennent scannables, et
// supprime la vente (vente_articles suit en cascade). Restreint à la caisse
// appelante par construction : on ne cherche que sa propre dernière vente.
export async function annulerDerniereVente(caisseId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const vente = await queryOne<{ id: string }>(
    "SELECT id FROM ventes WHERE caisse_id = ? ORDER BY created_at DESC LIMIT 1",
    [caisseId],
  );
  if (!vente) return { ok: false, error: "Aucune vente à annuler." };

  const articleIds = (
    await query<{ article_id: string }>("SELECT article_id FROM vente_articles WHERE vente_id = ?", [vente.id])
  ).map((r) => r.article_id);

  await withTransaction(async (conn) => {
    await conn.query("DELETE FROM ventes WHERE id = ?", [vente.id]);
    if (articleIds.length > 0) {
      const placeholders = articleIds.map(() => "?").join(", ");
      await conn.query(`UPDATE articles SET statut = 'recu' WHERE id IN (${placeholders})`, articleIds);
    }
  });

  return { ok: true };
}

export async function libererArticle(articleId: string, caisseId: string) {
  await query("DELETE FROM articles_reserves WHERE article_id = ? AND caisse_id = ?", [articleId, caisseId]);
}

export async function voirInstructions(posteId: string) {
  await query("UPDATE caisses SET instructions_vues = 1 WHERE poste_caisse_id = ? AND edition_id = (SELECT id FROM editions WHERE active_flag = 1)", [
    posteId,
  ]);
}

export async function theoriqueCaisse(caisseId: string): Promise<number> {
  const theorique = await queryOne<{ ventes: number; vidages: number }>(
    `SELECT
       COALESCE((SELECT SUM(va.prix_encaisse) FROM vente_articles va JOIN ventes v ON v.id = va.vente_id WHERE v.caisse_id = ?), 0) AS ventes,
       COALESCE((SELECT SUM(mc.montant) FROM mouvements_caisse mc WHERE mc.caisse_id = ?), 0) AS vidages`,
    [caisseId, caisseId],
  );
  return theorique ? arrondiCentimes(Number(theorique.ventes) - Number(theorique.vidages)) : 0;
}

export async function cloturerCaisse(caisseId: string, posteId: string, montantCompte: number) {
  // Dernier filet : toute quittance encore en_attente à la clôture n'aura
  // plus jamais de "vente suivante" pour déclencher son envoi normal.
  await flusherQuittancesEnAttente(caisseId).catch(() => {});
  await query("DELETE FROM articles_reserves WHERE caisse_id = ?", [caisseId]);
  await query("UPDATE caisses SET cloturee = 1, montant_cloture = ? WHERE id = ?", [
    arrondiCentimes(montantCompte),
    caisseId,
  ]);
  await query("UPDATE postes_caisse SET connecte = 0, session_token = NULL, demande_en_attente = 0 WHERE id = ?", [
    posteId,
  ]);

  const jar = await cookies();
  jar.delete(COOKIE_CAISSE);
  redirect("/gestion");
}
