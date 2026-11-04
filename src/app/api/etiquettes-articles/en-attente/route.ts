import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import type { ContenuEtiquettesArticles } from "@/lib/etiquettes-articles-impression";
import { requeteAutorisee } from "@/lib/print-agent-auth";

type Ligne = { id: string; contenu_json: string; created_at: string };

// Interrogée en boucle par print-agent (hors de ce dépôt) — même secret
// partagé que /api/etiquettes (voir print-agent-auth.ts), même principe :
// renvoie les feuilles encore en_attente, du plus ancien au plus récent.
export async function GET(request: NextRequest) {
  if (!(await requeteAutorisee(request))) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const lignes = await query<Ligne>(
    "SELECT id, contenu_json, created_at FROM etiquettes_articles_impression WHERE statut = 'en_attente' ORDER BY created_at ASC LIMIT 50",
  );

  return NextResponse.json({
    feuilles: lignes.map((l) => ({
      id: l.id,
      createdAt: l.created_at,
      contenu: JSON.parse(l.contenu_json) as ContenuEtiquettesArticles,
    })),
  });
}
