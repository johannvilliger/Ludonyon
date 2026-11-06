import "server-only";
import { headers } from "next/headers";

// Construit une URL absolue à partir du Host de la requête plutôt que d'une
// variable d'environnement fixe : s'adapte automatiquement si le site change
// de domaine/alias (voir la conversation sur l'alias Infomaniak), sans rien
// à reconfigurer.
export async function urlAbsolue(chemin: string): Promise<string> {
  // SITE_URL (optionnelle) court-circuite toute détection : utile quand le
  // proxy de l'hébergement ne transmet ni Host ni X-Forwarded-Host fiables
  // (on a vu les deux échouer en prod — les liens générés, confirmation
  // vendeur comme accès accueil/caisse, pointaient vers "localhost:3000").
  // Mettre ex. SITE_URL=https://troc.ludonyonregion.ch dans l'environnement
  // du serveur règle le problème sans dépendre de la config du proxy.
  const siteUrl = process.env.SITE_URL?.trim().replace(/\/+$/, "");
  if (siteUrl) return `${siteUrl}${chemin}`;

  const jar = await headers();
  const host = jar.get("x-forwarded-host") ?? jar.get("host") ?? "localhost:3000";
  const proto = jar.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  return `${proto}://${host}${chemin}`;
}
