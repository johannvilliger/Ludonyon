"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { nouveauCode as genererCode, nouvelId, query, queryOne, withTransaction } from "@/lib/db";
import { CATEGORIES_ARTICLES } from "@/lib/categories";
import { dashboardEstConnecte } from "@/lib/gestion";
import { genererSauvegardeSql } from "@/lib/sauvegarde";
import { NB_VENDEURS_TEST, PRIX_ARTICLES_TEST } from "@/lib/test-data";
import { estVendeurSpecial } from "@/lib/vendeurs-speciaux";

export async function telechargerSauvegarde(): Promise<string> {
  if (!(await dashboardEstConnecte())) throw new Error("Non autorisé.");
  return genererSauvegardeSql();
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
  await query("UPDATE editions SET phase = ? WHERE active_flag = 1", [nouvellePhase]);
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

export async function basculerVerrouillageSite(deverrouille: boolean) {
  if (!(await dashboardEstConnecte())) throw new Error("Non autorisé.");
  await query("UPDATE parametres_gestion SET deverrouille_manuellement = ? WHERE id = 1", [deverrouille]);
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
  const montant = Math.round(Number(formData.get("montant")));
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

export async function reinitialiserDonneesTest() {
  const edition = await queryOne<{ id: string }>("SELECT id FROM editions WHERE active_flag = 1");
  if (!edition) throw new Error("Aucune édition active.");

  await withTransaction(async (conn) => {
    // Ventes (et vente_articles en cascade), vidages, puis vendeurs (et
    // participations + articles en cascade) de l'édition en cours — sauf les
    // bénévoles/901/902, qui sont une base fixe et ne doivent jamais être
    // effacés par un simple reset de données de test.
    await conn.query("DELETE FROM ventes WHERE edition_id = ?", [edition.id]);
    await conn.query(
      "DELETE mc FROM mouvements_caisse mc JOIN caisses c ON c.id = mc.caisse_id WHERE c.edition_id = ?",
      [edition.id],
    );
    await conn.query(
      `DELETE v FROM vendeurs v
       JOIN participations p ON p.vendeur_id = v.id
       LEFT JOIN benevoles b ON b.vendeur_id = v.id
       WHERE p.edition_id = ? AND b.id IS NULL`,
      [edition.id],
    );
    await conn.query("UPDATE caisses SET fond_initial = 250, cloturee = 0, instructions_vues = 0 WHERE edition_id = ?", [
      edition.id,
    ]);

    for (let numeroVendeur = 1; numeroVendeur <= NB_VENDEURS_TEST; numeroVendeur++) {
      const vendeurId = nouvelId();
      await conn.query("INSERT INTO vendeurs (id, nom) VALUES (?, ?)", [
        vendeurId,
        `Test Vendeur ${String(numeroVendeur).padStart(2, "0")}`,
      ]);

      const participationId = nouvelId();
      await conn.query(
        "INSERT INTO participations (id, edition_id, vendeur_id, numero_vendeur, code_confirmation) VALUES (?, ?, ?, ?, ?)",
        [participationId, edition.id, vendeurId, numeroVendeur, genererCode()],
      );

      for (let i = 0; i < PRIX_ARTICLES_TEST.length; i++) {
        await conn.query(
          "INSERT INTO articles (id, participation_id, numero_article, nom, prix) VALUES (?, ?, ?, ?, ?)",
          [nouvelId(), participationId, i + 1, `Article test ${i + 1}`, PRIX_ARTICLES_TEST[i]],
        );
      }
    }
  });

  revalidatePath("/gestion/dashboard");
  revalidatePath("/gestion/dashboard/vendeurs");
}
