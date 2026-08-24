import "server-only";
import { cookies } from "next/headers";
import { queryOne } from "@/lib/db";

export const COOKIE_DASHBOARD = "gestion_dashboard";
export const COOKIE_CAISSE = "gestion_caisse";
export const COOKIE_ACCUEIL = "gestion_accueil";

const DUREE_SESSION_SECONDES = 60 * 60 * 16; // une longue journée de troc

export const OPTIONS_COOKIE_SESSION = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: DUREE_SESSION_SECONDES,
};

export async function dashboardEstConnecte(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(COOKIE_DASHBOARD)?.value;
  if (!token) return false;
  const row = await queryOne<{ id: number }>(
    "SELECT id FROM parametres_gestion WHERE id = 1 AND session_token = ?",
    [token],
  );
  return !!row;
}

// Contrairement au dashboard/aux caisses (session_token exclusif, une seule
// connexion active à la fois), l'accueil doit pouvoir être utilisé par
// plusieurs bénévoles en même temps sur plusieurs appareils — le cookie
// contient donc directement le code (comparé au code courant), pas un
// jeton de session à usage unique.
export async function accueilEstConnecte(): Promise<boolean> {
  const jar = await cookies();
  const valeur = jar.get(COOKIE_ACCUEIL)?.value;
  if (!valeur) return false;
  const row = await queryOne<{ id: number }>(
    "SELECT id FROM parametres_gestion WHERE id = 1 AND code_accueil = ?",
    [valeur],
  );
  return !!row;
}

export async function posteCaisseAutorise(numero: number): Promise<{ posteId: string } | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_CAISSE)?.value;
  if (!token) return null;
  const row = await queryOne<{ id: string }>(
    "SELECT id FROM postes_caisse WHERE numero = ? AND session_token = ? AND connecte = 1",
    [numero, token],
  );
  return row ? { posteId: row.id } : null;
}
