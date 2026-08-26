import "server-only";
import { headers } from "next/headers";

// Construit une URL absolue à partir du Host de la requête plutôt que d'une
// variable d'environnement fixe : s'adapte automatiquement si le site change
// de domaine/alias (voir la conversation sur l'alias Infomaniak), sans rien
// à reconfigurer.
export async function urlAbsolue(chemin: string): Promise<string> {
  const jar = await headers();
  const host = jar.get("host") ?? "localhost:3000";
  const proto = jar.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  return `${proto}://${host}${chemin}`;
}
