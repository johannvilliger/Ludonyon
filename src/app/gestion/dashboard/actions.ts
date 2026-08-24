"use server";

import { revalidatePath } from "next/cache";
import { nouveauCode as genererCode, nouvelId, query, queryOne, withTransaction } from "@/lib/db";
import { NB_VENDEURS_TEST, PRIX_ARTICLES_TEST } from "@/lib/test-data";

export type FormState = { error: string | null };

export async function creerEdition(_prevState: FormState, formData: FormData): Promise<FormState> {
  const annee = Math.round(Number(formData.get("annee")));
  if (!Number.isFinite(annee) || annee < 2000) return { error: "Année invalide." };

  const existante = await queryOne<{ id: string }>("SELECT id FROM editions WHERE active_flag = 1");
  if (existante) return { error: "Une édition est déjà active — clôture-la avant d'en créer une nouvelle." };

  const postes = await query<{ id: string; numero: number }>("SELECT id, numero FROM postes_caisse ORDER BY numero");

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
    // participations + articles en cascade) de l'édition en cours.
    await conn.query("DELETE FROM ventes WHERE edition_id = ?", [edition.id]);
    await conn.query(
      "DELETE mc FROM mouvements_caisse mc JOIN caisses c ON c.id = mc.caisse_id WHERE c.edition_id = ?",
      [edition.id],
    );
    await conn.query(
      "DELETE v FROM vendeurs v JOIN participations p ON p.vendeur_id = v.id WHERE p.edition_id = ?",
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
