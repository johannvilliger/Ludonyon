"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { arrondiCentimes } from "@/lib/argent";
import { nouveauCode as genererCode, nouvelId, query, queryOne, withTransaction } from "@/lib/db";
import { CATEGORIES_ARTICLES } from "@/lib/categories";
import { dashboardEstConnecte } from "@/lib/gestion";
import { genererSauvegardeSql } from "@/lib/sauvegarde";
import { estVendeurSpecial } from "@/lib/vendeurs-speciaux";

export async function telechargerSauvegarde(): Promise<string> {
  if (!(await dashboardEstConnecte())) throw new Error("Non autorisé.");
  const sql = await genererSauvegardeSql();
  await query("UPDATE parametres_gestion SET derniere_sauvegarde_le = NOW() WHERE id = 1");
  revalidatePath("/gestion/dashboard");
  return sql;
}

// Réservé aux tests : une édition "terminée" (phase = 'terminee') devient
// invisible au dashboard (active_flag = NULL, voir migration 0004) et
// bloque la réutilisation de son année (UNIQUE KEY editions_annee_uk) sans
// aucun moyen de revenir dessus depuis l'interface. La suppression efface
// tout ce qui lui est rattaché (caisses, participations, articles,
// ventes...) — jamais les bénévoles/vendeurs, qui sont une base fixe
// indépendante des éditions. Effacé dans l'ordre à la main plutôt que via
// ON DELETE CASCADE : MySQL ne garantit pas l'ordre entre deux chemins de
// cascade différents menant à la même table (ex. caisses -> ventes ET
// editions -> ventes), et peut échouer avec une contrainte FK sinon.
export async function supprimerEdition(editionId: string) {
  if (!(await dashboardEstConnecte())) throw new Error("Non autorisé.");

  await withTransaction(async (conn) => {
    await conn.query(
      "DELETE cl FROM clotures cl JOIN participations p ON p.id = cl.participation_id WHERE p.edition_id = ?",
      [editionId],
    );
    // remboursements (migration 0020) référence vente_articles sans
    // ON DELETE CASCADE — doit être effacé avant, sinon la suppression de
    // vente_articles juste après échoue avec une contrainte FK.
    await conn.query(
      "DELETE r FROM remboursements r JOIN caisses c ON c.id = r.caisse_id WHERE c.edition_id = ?",
      [editionId],
    );
    await conn.query(
      "DELETE va FROM vente_articles va JOIN ventes v ON v.id = va.vente_id WHERE v.edition_id = ?",
      [editionId],
    );
    await conn.query("DELETE FROM ventes WHERE edition_id = ?", [editionId]);
    await conn.query(
      "DELETE mc FROM mouvements_caisse mc JOIN caisses c ON c.id = mc.caisse_id WHERE c.edition_id = ?",
      [editionId],
    );
    await conn.query(
      "DELETE a FROM articles a JOIN participations p ON p.id = a.participation_id WHERE p.edition_id = ?",
      [editionId],
    );
    await conn.query("DELETE FROM participations WHERE edition_id = ?", [editionId]);
    await conn.query("DELETE FROM categories WHERE edition_id = ?", [editionId]);
    await conn.query("DELETE FROM caisses WHERE edition_id = ?", [editionId]);
    await conn.query("DELETE FROM editions WHERE id = ? AND active_flag IS NULL", [editionId]);
  });

  revalidatePath("/gestion/dashboard");
}

export type FormState = { error: string | null };

export async function creerEdition(_prevState: FormState, formData: FormData): Promise<FormState> {
  const annee = Math.round(Number(formData.get("annee")));
  if (!Number.isFinite(annee) || annee < 2000) return { error: "Année invalide." };

  const existante = await queryOne<{ id: string }>("SELECT id FROM editions WHERE active_flag = 1");
  if (existante) return { error: "Une édition est déjà active — clôture-la avant d'en créer une nouvelle." };

  const postes = await query<{ id: string; numero: number }>("SELECT id, numero FROM postes_caisse ORDER BY numero");
  const benevoles = await query<{ vendeur_id: string; numero_fixe: number }>(
    "SELECT vendeur_id, numero_fixe FROM benevoles ORDER BY numero_fixe",
  );

  try {
    await withTransaction(async (conn) => {
      const editionId = nouvelId();
      await conn.query("INSERT INTO editions (id, annee) VALUES (?, ?)", [editionId, annee]);

      for (const poste of postes) {
        await conn.query("INSERT INTO caisses (id, edition_id, nom, poste_caisse_id) VALUES (?, ?, ?, ?)", [
          nouvelId(),
          editionId,
          `Caisse ${poste.numero}`,
          poste.id,
        ]);
      }

      // Catégories fixes pour le classement automatique des articles
      // (voir /gestion/dashboard/vendeurs, bouton "Classer les articles").
      for (let i = 0; i < CATEGORIES_ARTICLES.length; i++) {
        await conn.query("INSERT INTO categories (id, edition_id, nom, ordre) VALUES (?, ?, ?, ?)", [
          nouvelId(),
          editionId,
          CATEGORIES_ARTICLES[i],
          i,
        ]);
      }

      // Bénévoles (base fixe) + 901/902 : présents automatiquement à chaque
      // édition avec leur numéro permanent, même s'ils finissent par n'avoir
      // aucun article — voir migration 0007.
      for (const b of benevoles) {
        await conn.query(
          "INSERT INTO participations (id, edition_id, vendeur_id, numero_vendeur, code_confirmation, est_benevole) VALUES (?, ?, ?, ?, ?, ?)",
          [nouvelId(), editionId, b.vendeur_id, b.numero_fixe, genererCode(), !estVendeurSpecial(b.numero_fixe)],
        );
      }
    });
  } catch {
    return { error: "Impossible de créer l'édition, réessayez." };
  }

  revalidatePath("/gestion/dashboard");
  return { error: null };
}

const PHASES = ["depot", "reception", "caisse", "post_vente"] as const;
export type Phase = (typeof PHASES)[number];

export async function changerPhase(nouvellePhase: Phase) {
  if (!PHASES.includes(nouvellePhase)) throw new Error("Phase inconnue.");

  // Doublon volontaire du blocage côté client (bouton "Post-vente", voir
  // page.tsx) : la vraie protection est ici, pour ne jamais dépendre d'un
  // caissier qui aurait échappé au JS. Une caisse jamais utilisée peut être
  // clôturée à zéro depuis le dashboard (voir cloturerCaisseVide) plutôt que
  // de bloquer indéfiniment le passage en post-vente.
  if (nouvellePhase === "post_vente") {
    const ouvertes = await queryOne<{ nb: number }>(
      `SELECT COUNT(*) AS nb
       FROM postes_caisse pc
       JOIN caisses c ON c.poste_caisse_id = pc.id
       JOIN editions e ON e.id = c.edition_id
       WHERE e.active_flag = 1 AND pc.type = 'vente' AND c.cloturee = 0`,
    );
    if (Number(ouvertes?.nb ?? 0) > 0) {
      throw new Error("Clôturez d'abord toutes les caisses de vente avant de passer en post-vente.");
    }
  }

  await query("UPDATE editions SET phase = ? WHERE active_flag = 1", [nouvellePhase]);
  revalidatePath("/gestion/dashboard");
}

// Clôture depuis le dashboard une caisse restée à zéro (jamais connectée, ou
// connectée sans aucune vente ni vidage) — sert à débloquer le passage en
// post-vente (voir le garde-fou ci-dessus) quand un poste n'a simplement pas
// été utilisé pendant l'édition. Toute caisse ayant eu du mouvement doit
// être clôturée depuis son propre poste (voir cloturerCaisse, identique en
// substance mais réservée au caissier lui-même).
export async function cloturerCaisseVide(caisseId: string) {
  if (!(await dashboardEstConnecte())) throw new Error("Non autorisé.");

  const caisse = await queryOne<{ poste_caisse_id: string | null; fond_initial: number | null; cloturee: number }>(
    "SELECT poste_caisse_id, fond_initial, cloturee FROM caisses WHERE id = ?",
    [caisseId],
  );
  if (!caisse) throw new Error("Caisse introuvable.");
  if (caisse.cloturee) return;

  const activite = await queryOne<{ ventes: number; vidages: number }>(
    `SELECT
       COALESCE((SELECT SUM(va.prix_encaisse) FROM vente_articles va JOIN ventes v ON v.id = va.vente_id WHERE v.caisse_id = ?), 0) AS ventes,
       COALESCE((SELECT SUM(mc.montant) FROM mouvements_caisse mc WHERE mc.caisse_id = ?), 0) AS vidages`,
    [caisseId, caisseId],
  );
  if (Number(activite?.ventes ?? 0) !== 0 || Number(activite?.vidages ?? 0) !== 0) {
    throw new Error("Cette caisse a eu du mouvement — elle doit être clôturée depuis son propre poste.");
  }

  await query("UPDATE caisses SET cloturee = 1, montant_cloture = ? WHERE id = ?", [
    arrondiCentimes(caisse.fond_initial ?? 0),
    caisseId,
  ]);
  if (caisse.poste_caisse_id) {
    await query("UPDATE postes_caisse SET connecte = 0, session_token = NULL, demande_en_attente = 0 WHERE id = ?", [
      caisse.poste_caisse_id,
    ]);
  }

  revalidatePath("/gestion/dashboard");
}

// Volontairement à part des 4 phases réversibles ci-dessus : une fois
// "terminee", l'édition n'est plus active_flag = 1 (voir migration 0004) et
// devient invisible au dashboard/à l'accueil — impossible de revenir en
// arrière depuis cette interface. Ne s'utilise qu'une fois le travail de
// post-vente terminé.
export async function terminerEdition() {
  await query("UPDATE editions SET phase = 'terminee' WHERE active_flag = 1", []);
  revalidatePath("/gestion/dashboard");
}

// Bascule tout ce qui n'a pas été vendu en "invendu" pour figer les
// chiffres de l'étiquette enveloppe (nb ventes/invendus/dû), puis emmène
// directement sur la page d'impression.
export async function lancerClotureVente() {
  const edition = await queryOne<{ id: string }>("SELECT id FROM editions WHERE active_flag = 1");
  if (!edition) throw new Error("Aucune édition active.");

  await query(
    `UPDATE articles a
     JOIN participations p ON p.id = a.participation_id
     SET a.statut = 'invendu'
     WHERE p.edition_id = ? AND a.statut IN ('non_recu', 'recu')`,
    [edition.id],
  );

  revalidatePath("/gestion/dashboard");
  redirect("/gestion/dashboard/cloture-vente");
}

const MODES_VERROUILLAGE = ["auto", "deverrouille", "verrouille"] as const;
export type ModeVerrouillage = (typeof MODES_VERROUILLAGE)[number];

export async function basculerVerrouillageSite(mode: ModeVerrouillage) {
  if (!(await dashboardEstConnecte())) throw new Error("Non autorisé.");
  if (!MODES_VERROUILLAGE.includes(mode)) throw new Error("Mode invalide.");
  await query("UPDATE parametres_gestion SET mode_verrouillage = ? WHERE id = 1", [mode]);
  revalidatePath("/gestion/dashboard");
}

// valeurDatetimeLocal vient d'un <input type="datetime-local">, ex.
// "2026-09-15T10:30" — vide = pas de compteur affiché sur l'écran de
// verrouillage.
export async function modifierDateOuverture(valeurDatetimeLocal: string) {
  if (!(await dashboardEstConnecte())) throw new Error("Non autorisé.");
  const valeur = valeurDatetimeLocal.trim();
  // "2026-09-15T10:30" (format natif de l'input) -> "2026-09-15 10:30:00".
  const datetimeMysql = valeur ? `${valeur.replace("T", " ")}:00`.slice(0, 19) : null;
  await query("UPDATE parametres_gestion SET date_ouverture_troc = ? WHERE id = 1", [datetimeMysql]);
  revalidatePath("/gestion/dashboard");
  revalidatePath("/verrouille");
}

// Même mécanisme que modifierDateOuverture (voir juste au-dessus) : rappelée
// dans l'email envoyé par l'accueil à la réception d'une liste (voir
// marquerControlee, accueil/vendeur/[code]/actions.ts).
export async function modifierDateRecuperation(valeurDatetimeLocal: string) {
  if (!(await dashboardEstConnecte())) throw new Error("Non autorisé.");
  const valeur = valeurDatetimeLocal.trim();
  const datetimeMysql = valeur ? `${valeur.replace("T", " ")}:00`.slice(0, 19) : null;
  await query("UPDATE parametres_gestion SET date_recuperation_invendus = ? WHERE id = 1", [datetimeMysql]);
  revalidatePath("/gestion/dashboard");
}

export async function relancerTicketsEchec() {
  if (!(await dashboardEstConnecte())) throw new Error("Non autorisé.");
  await query("UPDATE etiquettes_impression SET statut = 'en_attente' WHERE statut = 'echec'");
  revalidatePath("/gestion/dashboard");
}

// Ne touche jamais à la vente/aux articles derrière chaque ticket (seule la
// file d'impression est purgée) — utile après une config d'imprimante
// erronée : on repart d'une file vide plutôt que de réimprimer en rafale des
// tickets accumulés pendant le mauvais réglage.
export async function purgerTicketsEnAttente() {
  if (!(await dashboardEstConnecte())) throw new Error("Non autorisé.");
  await query("DELETE FROM etiquettes_impression WHERE statut = 'en_attente'");
  revalidatePath("/gestion/dashboard");
}

export async function modifierMessageDepotTermine(nouveauMessage: string) {
  if (!(await dashboardEstConnecte())) throw new Error("Non autorisé.");
  const message = nouveauMessage.trim();
  await query("UPDATE parametres_gestion SET message_depot_termine = ? WHERE id = 1", [message || null]);
  revalidatePath("/gestion/dashboard");
  revalidatePath("/vendeur/nouveau");
}

export async function modifierCodeCaisse(posteId: string, nouveauCode: string) {
  const code = nouveauCode.trim();
  if (!code) throw new Error("Le code ne peut pas être vide.");
  await query("UPDATE postes_caisse SET code_acces = ? WHERE id = ?", [code, posteId]);
  revalidatePath("/gestion/dashboard");
}

export async function modifierCodeDashboard(nouveauCode: string) {
  const code = nouveauCode.trim();
  if (!code) throw new Error("Le code ne peut pas être vide.");
  await query("UPDATE parametres_gestion SET code_dashboard = ? WHERE id = 1", [code]);
  revalidatePath("/gestion/dashboard");
}

export async function modifierCodeAccueil(nouveauCode: string) {
  const code = nouveauCode.trim();
  if (!code) throw new Error("Le code ne peut pas être vide.");
  await query("UPDATE parametres_gestion SET code_accueil = ? WHERE id = 1", [code]);
  revalidatePath("/gestion/dashboard");
}

// Secret machine-à-machine pour print-agent (voir src/lib/print-agent-auth.ts)
// — pas un code que quelqu'un tape, juste copié une fois dans sa config.
export async function modifierCodeImpression(nouveauCode: string) {
  const code = nouveauCode.trim();
  if (!code) throw new Error("Le code ne peut pas être vide.");
  await query("UPDATE parametres_gestion SET code_impression = ? WHERE id = 1", [code]);
  revalidatePath("/gestion/dashboard");
}

export async function validerConnexionCaisse(posteId: string) {
  const token = nouvelId();
  await query("UPDATE postes_caisse SET connecte = 1, demande_en_attente = 0, session_token = ? WHERE id = ?", [
    token,
    posteId,
  ]);
  revalidatePath("/gestion/dashboard");
}

export async function refuserConnexionCaisse(posteId: string) {
  await query("UPDATE postes_caisse SET demande_en_attente = 0 WHERE id = ?", [posteId]);
  revalidatePath("/gestion/dashboard");
}

export async function deconnecterCaisse(posteId: string) {
  await query("UPDATE postes_caisse SET connecte = 0, session_token = NULL, demande_en_attente = 0 WHERE id = ?", [
    posteId,
  ]);
  revalidatePath("/gestion/dashboard");
}

// Réouvre une caisse clôturée par erreur (ou pour rejouer un scénario de
// test) sans toucher aux ventes déjà encaissées ni aux autres caisses — la
// caissière devra se reconnecter normalement avec son code une fois
// rouverte.
export async function rouvrirCaisse(caisseId: string) {
  await query("UPDATE caisses SET cloturee = 0, montant_cloture = NULL WHERE id = ?", [caisseId]);
  revalidatePath("/gestion/dashboard");
}

export type VidageState = { error: string | null };

export async function enregistrerVidage(_prevState: VidageState, formData: FormData): Promise<VidageState> {
  const caisseId = String(formData.get("caisse_id") ?? "");
  const montant = arrondiCentimes(Number(formData.get("montant")));
  const effectuePar = String(formData.get("effectue_par") ?? "").trim();

  if (!caisseId) return { error: "Caisse manquante." };
  if (!Number.isFinite(montant) || montant <= 0) return { error: "Montant invalide." };
  if (!effectuePar) return { error: "Indiquez qui effectue le vidage." };

  try {
    await query("INSERT INTO mouvements_caisse (id, caisse_id, montant, effectue_par) VALUES (?, ?, ?, ?)", [
      nouvelId(),
      caisseId,
      montant,
      effectuePar,
    ]);
  } catch {
    return { error: "Impossible d'enregistrer le vidage." };
  }

  revalidatePath("/gestion/dashboard");
  return { error: null };
}

