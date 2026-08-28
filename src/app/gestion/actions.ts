"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { nouvelId, query, queryOne } from "@/lib/db";
import { COOKIE_ACCUEIL, COOKIE_CAISSE, COOKIE_DASHBOARD, OPTIONS_COOKIE_SESSION } from "@/lib/gestion";
import { enregistrerEchec, ipAppelante, reinitialiserEchecs, verifierBlocage } from "@/lib/rate-limit";

export type CodeState = { error: string | null };

function messageBlocage(secondesRestantes: number): string {
  const unite = secondesRestantes > 60 ? `${Math.ceil(secondesRestantes / 60)} minute(s)` : `${secondesRestantes} seconde(s)`;
  return `Trop de tentatives échouées. Réessayez dans ${unite}.`;
}

export async function validerCode(_prevState: CodeState, formData: FormData): Promise<CodeState> {
  const ip = await ipAppelante();
  const cle = `gestion:${ip}`;
  const blocage = verifierBlocage(cle);
  if (blocage.bloque) return { error: messageBlocage(blocage.secondesRestantes) };

  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { error: "Entrez un code." };

  const dashboard = await queryOne<{ id: number }>("SELECT id FROM parametres_gestion WHERE code_dashboard = ?", [
    code,
  ]);

  if (dashboard) {
    const token = nouvelId();
    await query("UPDATE parametres_gestion SET session_token = ? WHERE id = 1", [token]);
    const jar = await cookies();
    jar.set(COOKIE_DASHBOARD, token, OPTIONS_COOKIE_SESSION);
    reinitialiserEchecs(cle);
    redirect("/gestion/dashboard");
  }

  const accueil = await queryOne<{ id: number }>("SELECT id FROM parametres_gestion WHERE code_accueil = ?", [code]);

  if (accueil) {
    const jar = await cookies();
    jar.set(COOKIE_ACCUEIL, code, OPTIONS_COOKIE_SESSION);
    reinitialiserEchecs(cle);
    redirect("/accueil");
  }

  const poste = await queryOne<{ id: string; numero: number; connecte: number; type: "vente" | "remboursement" }>(
    "SELECT id, numero, connecte, type FROM postes_caisse WHERE code_acces = ?",
    [code],
  );

  if (poste) {
    reinitialiserEchecs(cle);

    if (poste.connecte) {
      return { error: `La caisse ${poste.numero} est déjà connectée ailleurs.` };
    }

    const edition = await queryOne<{ phase: string }>("SELECT phase FROM editions WHERE active_flag = 1");
    // Les remboursements peuvent avoir lieu après la fin de la vente (un
    // acheteur revient plus tard) — on autorise donc aussi la phase
    // "post_vente" pour ce type de poste, contrairement aux caisses de vente.
    const phasesAutorisees = poste.type === "remboursement" ? ["caisse", "post_vente"] : ["caisse"];
    if (!edition || !phasesAutorisees.includes(edition.phase)) {
      return { error: "Les caisses ne sont pas encore ouvertes — l'édition n'est pas en phase « Caisse »." };
    }

    const caisse = await queryOne<{ cloturee: number }>(
      `SELECT c.cloturee FROM caisses c JOIN editions e ON e.id = c.edition_id
       WHERE c.poste_caisse_id = ? AND e.active_flag = 1`,
      [poste.id],
    );
    if (caisse?.cloturee) {
      return { error: `La caisse ${poste.numero} a déjà été clôturée pour cette édition.` };
    }

    await query("UPDATE postes_caisse SET demande_en_attente = 1 WHERE id = ?", [poste.id]);
    redirect(`/gestion/attente/${poste.numero}`);
  }

  await enregistrerEchec(cle, ip, "/gestion (dashboard/accueil/caisse)");
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
