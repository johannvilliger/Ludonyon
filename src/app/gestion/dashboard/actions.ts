"use server";

import { revalidatePath } from "next/cache";
import { nouvelId, query, queryOne, withTransaction } from "@/lib/db";

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
    return { error: "Impossible de créer l'édition, réessaie." };
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
  if (!effectuePar) return { error: "Indique qui effectue le vidage." };

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
