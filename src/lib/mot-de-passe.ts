import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const LONGUEUR_CLE = 64;

export function hasherMotDePasse(motDePasse: string): string {
  const sel = randomBytes(16).toString("hex");
  const cle = scryptSync(motDePasse, sel, LONGUEUR_CLE).toString("hex");
  return `${sel}:${cle}`;
}

export function verifierMotDePasse(motDePasse: string, hash: string): boolean {
  const [sel, cle] = hash.split(":");
  if (!sel || !cle) return false;
  const cleCandidate = scryptSync(motDePasse, sel, LONGUEUR_CLE);
  const cleAttendue = Buffer.from(cle, "hex");
  if (cleCandidate.length !== cleAttendue.length) return false;
  return timingSafeEqual(cleCandidate, cleAttendue);
}
