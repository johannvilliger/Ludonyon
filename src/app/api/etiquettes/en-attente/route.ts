import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import type { ContenuTicket } from "@/lib/etiquettes-impression";
import { requeteAutorisee } from "@/lib/print-agent-auth";

type Ligne = { id: string; contenu_json: string; created_at: string };

// Interrogée en boucle par print-agent (hors de ce dépôt) : renvoie les
// tickets encore en_attente, du plus ancien au plus récent, pour ne jamais
// laisser un ticket bloqué derrière un afflux de nouveaux si l'imprimante a
// pris du retard. Plafonné à 50 par appel — largement suffisant pour un
// intervalle de sondage de quelques secondes.
export async function GET(request: NextRequest) {
  if (!(await requeteAutorisee(request))) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const lignes = await query<Ligne>(
    "SELECT id, contenu_json, created_at FROM etiquettes_impression WHERE statut = 'en_attente' ORDER BY created_at ASC LIMIT 50",
  );

  return NextResponse.json({
    tickets: lignes.map((l) => ({
      id: l.id,
      createdAt: l.created_at,
      contenu: JSON.parse(l.contenu_json) as ContenuTicket,
    })),
  });
}
