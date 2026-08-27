"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { nouvelId, query, queryOne } from "@/lib/db";
import { OPTIONS_COOKIE_SESSION } from "@/lib/gestion";
import { COOKIE_BENEVOLE } from "@/lib/benevole-session";
import { verifierMotDePasse } from "@/lib/mot-de-passe";
import { enregistrerEchec, ipAppelante, reinitialiserEchecs, verifierBlocage } from "@/lib/rate-limit";

export type LoginState = { error: string | null };

function messageBlocage(secondesRestantes: number): string {
  const unite = secondesRestantes > 60 ? `${Math.ceil(secondesRestantes / 60)} minute(s)` : `${secondesRestantes} seconde(s)`;
  return `Trop de tentatives échouées. Réessayez dans ${unite}.`;
}

export async function connexionBenevole(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const ip = await ipAppelante();
  const cle = `benevole:${ip}`;
  const blocage = verifierBlocage(cle);
  if (blocage.bloque) return { error: messageBlocage(blocage.secondesRestantes) };

  const numero = Math.round(Number(formData.get("numero")));
  const motDePasse = String(formData.get("mot_de_passe") ?? "");

  if (!Number.isFinite(numero) || !motDePasse) {
    return { error: "Indiquez votre numéro et votre mot de passe." };
  }

  const benevole = await queryOne<{ id: string; mot_de_passe_hash: string }>(
    "SELECT id, mot_de_passe_hash FROM benevoles WHERE numero_fixe = ?",
    [numero],
  );

  // mot_de_passe_hash vide = pas encore défini par le staff : on refuse
  // exactement comme un mauvais mot de passe, sans distinguer les deux cas.
  if (!benevole || !benevole.mot_de_passe_hash || !verifierMotDePasse(motDePasse, benevole.mot_de_passe_hash)) {
    await enregistrerEchec(cle, ip, "/benevole");
    return { error: "Numéro ou mot de passe incorrect." };
  }

  const token = nouvelId();
  await query("UPDATE benevoles SET session_token = ? WHERE id = ?", [token, benevole.id]);

  const jar = await cookies();
  jar.set(COOKIE_BENEVOLE, token, OPTIONS_COOKIE_SESSION);
  reinitialiserEchecs(cle);
  redirect("/benevole/liste");
}

export async function deconnexionBenevole() {
  const jar = await cookies();
  jar.delete(COOKIE_BENEVOLE);
  redirect("/benevole");
}
