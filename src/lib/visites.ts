import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { after } from "next/server";
import { ipAppelante } from "./rate-limit";
import { nouvelId, query, queryOne } from "./db";

// Filtre minimal anti-robots : le signal recherché ("est-ce que des gens
// regardent") serait faussé par le passage régulier de crawlers.
const MOTIF_ROBOT =
  /bot|crawler|spider|slurp|googlebot|bingbot|duckduckbot|baiduspider|yandexbot|semrushbot|ahrefsbot|mj12bot|petalbot|facebookexternalhit/i;

// Empreinte non réversible (IP + user-agent + jour + sel serveur secret) :
// voir migration 0029. Le jour fait partie de l'empreinte, donc un même
// visiteur obtient un hash différent chaque jour — aucun suivi possible
// d'un jour à l'autre, seulement un comptage de visiteurs distincts par
// jour.
async function empreinteVisiteur(ip: string, userAgent: string): Promise<string | null> {
  const parametres = await queryOne<{ visites_sel: string | null }>(
    "SELECT visites_sel FROM parametres_gestion WHERE id = 1",
  );
  if (!parametres?.visites_sel) return null;
  const jour = new Date().toISOString().slice(0, 10);
  return createHash("sha256")
    .update(`${parametres.visites_sel}|${ip}|${userAgent}|${jour}`)
    .digest("hex");
}

// Les API de requête (headers/IP) ne sont garanties disponibles qu'AVANT
// after() dans une Page — jamais à l'intérieur de son callback (voir doc
// Next.js "after"). On les lit donc tout de suite, et on ne reporte après
// l'envoi de la réponse que le hachage + l'écriture en base, pour ne
// jamais ralentir l'affichage de la page d'accueil. Best-effort : un raté
// ici ne doit jamais faire échouer la page.
export async function enregistrerVisite(): Promise<void> {
  const jar = await headers();
  const userAgent = jar.get("user-agent") ?? "";
  if (MOTIF_ROBOT.test(userAgent)) return;
  const ip = await ipAppelante();

  after(async () => {
    try {
      const hash = await empreinteVisiteur(ip, userAgent);
      if (!hash) return;
      await query("INSERT INTO visites (id, visiteur_hash) VALUES (?, ?)", [nouvelId(), hash]);
    } catch (err) {
      console.error("Échec de l'enregistrement de la visite :", err);
    }
  });
}
