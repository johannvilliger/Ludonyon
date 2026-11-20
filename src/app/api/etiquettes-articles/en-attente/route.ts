import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import type { ContenuEtiquettesArticles } from "@/lib/etiquettes-articles-impression";
import { requeteAutorisee } from "@/lib/print-agent-auth";

type Ligne = { id: string; contenu_json: string; created_at: string };

// Interrogée en boucle par print-agent (hors de ce dépôt) — même secret
// partagé que /api/etiquettes (voir print-agent-auth.ts), même principe :
// renvoie les feuilles encore en_attente, dans l'ordre d'insertion.
//
// Trié par `ordre` (AUTO_INCREMENT, voir migration 0038), pas created_at :
// un envoi en masse (plage de vendeurs) insère plusieurs feuilles dans la
// même seconde, created_at ne départageait alors plus rien et l'impression
// sortait dans un ordre quasi aléatoire au lieu de 1, 2, 3...
export async function GET(request: NextRequest) {
  if (!(await requeteAutorisee(request))) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const lignes = await query<Ligne>(
    "SELECT id, contenu_json, created_at FROM etiquettes_articles_impression WHERE statut = 'en_attente' ORDER BY ordre ASC LIMIT 50",
  );

  return NextResponse.json({
    feuilles: lignes.map((l) => ({
      id: l.id,
      createdAt: l.created_at,
      contenu: JSON.parse(l.contenu_json) as ContenuEtiquettesArticles,
    })),
  });
}
