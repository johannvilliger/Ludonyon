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
  // "secure" désactivé en dev (npm run dev tourne en http://localhost, un
  // cookie secure ne serait jamais envoyé) mais actif en production, où le
  // site est toujours servi en HTTPS — empêche le cookie de session de
  // transiter en clair si jamais une requête HTTP non chiffrée passait.
  secure: process.env.NODE_ENV === "production",
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

// Verrouillage global du site public (tout sauf /gestion, voir proxy.ts).
// Trois modes depuis le dashboard : 'auto' (par défaut — déverrouillé si une
// édition est active, verrouillé sinon, sans y penser), 'deverrouille' (force
// l'accès pour tester/démontrer sans édition active) et 'verrouille' (force
// le blocage même avec une édition active, ex. tests en conditions réelles
// un week-end sans exposer le site au public).
export async function siteTrocOuvert(): Promise<boolean> {
  const parametres = await queryOne<{ mode_verrouillage: "auto" | "deverrouille" | "verrouille" }>(
    "SELECT mode_verrouillage FROM parametres_gestion WHERE id = 1",
  );
  if (parametres?.mode_verrouillage === "verrouille") return false;
  if (parametres?.mode_verrouillage === "deverrouille") return true;

  const edition = await queryOne<{ id: string }>("SELECT id FROM editions WHERE active_flag = 1");
  return Boolean(edition);
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
