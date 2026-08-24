"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { nouvelId, query, queryOne } from "@/lib/db";
import { COOKIE_CAISSE, COOKIE_DASHBOARD, OPTIONS_COOKIE_SESSION } from "@/lib/gestion";

export type CodeState = { error: string | null };

export async function validerCode(_prevState: CodeState, formData: FormData): Promise<CodeState> {
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { error: "Entre un code." };

  const dashboard = await queryOne<{ id: number }>("SELECT id FROM parametres_gestion WHERE code_dashboard = ?", [
    code,
  ]);

  if (dashboard) {
    const token = nouvelId();
    await query("UPDATE parametres_gestion SET session_token = ? WHERE id = 1", [token]);
    const jar = await cookies();
    jar.set(COOKIE_DASHBOARD, token, OPTIONS_COOKIE_SESSION);
    redirect("/gestion/dashboard");
  }

  const poste = await queryOne<{ id: string; numero: number; connecte: number }>(
    "SELECT id, numero, connecte FROM postes_caisse WHERE code_acces = ?",
    [code],
  );

  if (poste) {
    if (poste.connecte) {
      return { error: `La caisse ${poste.numero} est déjà connectée ailleurs.` };
    }
    await query("UPDATE postes_caisse SET demande_en_attente = 1 WHERE id = ?", [poste.id]);
    redirect(`/gestion/attente/${poste.numero}`);
  }

  return { error: "Code invalide." };
}

export type StatutAttente = "attente" | "approuve" | "refuse";

export async function verifierApprobation(numero: number): Promise<{ statut: StatutAttente }> {
  const poste = await queryOne<{
    connecte: number;
    demande_en_attente: number;
    session_token: string | null;
  }>("SELECT connecte, demande_en_attente, session_token FROM postes_caisse WHERE numero = ?", [numero]);

  if (!poste) return { statut: "refuse" };

  if (poste.connecte && poste.session_token && !poste.demande_en_attente) {
    const jar = await cookies();
    jar.set(COOKIE_CAISSE, poste.session_token, OPTIONS_COOKIE_SESSION);
    return { statut: "approuve" };
  }

  if (poste.demande_en_attente) return { statut: "attente" };

  return { statut: "refuse" };
}
