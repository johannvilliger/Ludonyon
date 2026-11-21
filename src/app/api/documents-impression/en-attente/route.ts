import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requeteAutorisee } from "@/lib/print-agent-auth";

type Ligne = { id: string; nom_fichier: string; pdf_base64: string };

// Interrogée en boucle par print-agent (hors de ce dépôt) — même secret
// partagé que /api/etiquettes et /api/etiquettes-articles. Contrairement à
// ces deux-là, le PDF est déjà entièrement rendu (voir migration 0039) :
// print-agent le décode et l'envoie tel quel à l'imprimante, sans rien
// reconstruire.
export async function GET(request: NextRequest) {
  if (!(await requeteAutorisee(request))) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const lignes = await query<Ligne>(
    "SELECT id, nom_fichier, pdf_base64 FROM documents_impression WHERE statut = 'en_attente' ORDER BY ordre ASC LIMIT 20",
  );

  return NextResponse.json({
    documents: lignes.map((l) => ({ id: l.id, nomFichier: l.nom_fichier, pdfBase64: l.pdf_base64 })),
  });
}
