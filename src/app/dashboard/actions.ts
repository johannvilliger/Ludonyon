"use server";

import { revalidatePath } from "next/cache";
import { nouvelId, query } from "@/lib/db";

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

  revalidatePath("/dashboard");
  return { error: null };
}
