import "server-only";
import { cookies } from "next/headers";
import { queryOne } from "@/lib/db";

export const COOKIE_BENEVOLE = "benevole_session";

export type SessionBenevole = { vendeurId: string; numeroFixe: number; nom: string };

export async function benevoleConnecte(): Promise<SessionBenevole | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_BENEVOLE)?.value;
  if (!token) return null;

  const row = await queryOne<{ vendeur_id: string; numero_fixe: number; nom: string }>(
    `SELECT b.vendeur_id, b.numero_fixe, v.nom
     FROM benevoles b
     JOIN vendeurs v ON v.id = b.vendeur_id
     WHERE b.session_token = ?`,
    [token],
  );

  return row ? { vendeurId: row.vendeur_id, numeroFixe: row.numero_fixe, nom: row.nom } : null;
}
