import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requeteAutorisee } from "@/lib/print-agent-auth";

const STATUTS_VALIDES = ["imprimee", "echec"] as const;

// Appelée par print-agent juste après avoir tenté l'impression d'une
// feuille d'étiquettes (succès ou échec) — même principe que
// /api/etiquettes/[id]/statut pour les tickets.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requeteAutorisee(request))) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const statut = (body as { statut?: string })?.statut;
  if (!STATUTS_VALIDES.includes(statut as (typeof STATUTS_VALIDES)[number])) {
    return NextResponse.json({ error: "Statut invalide (imprimee | echec attendu)." }, { status: 400 });
  }

  await query("UPDATE etiquettes_articles_impression SET statut = ?, imprimee_le = NOW() WHERE id = ?", [
    statut,
    id,
  ]);

  return NextResponse.json({ ok: true });
}
