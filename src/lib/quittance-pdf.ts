import "server-only";
import PDFDocument from "pdfkit";
import { arrondiCentimes, formaterMontant } from "@/lib/argent";
import { query, queryOne } from "@/lib/db";

type Vente = { created_at: string; numero_caisse: number; annee: number };
type Ligne = { nom: string; numero_vendeur: number; prix_encaisse: number };

const MARGE = 50;
const LARGEUR_PAGE = 595.28; // A4 portrait, points
const COL = { nom: MARGE, vendeur: 350, prix: 460 };
const FIN_TABLEAU = LARGEUR_PAGE - MARGE;

// Reçu imprimable pour une vente déjà encaissée, demandé a posteriori depuis
// l'historique (voir gestion/dashboard/historique/[numero]/actions.ts) —
// même source de données (vente_articles) que la quittance email
// (envoyerUneQuittance, caisse/[numero]/actions.ts), mais rendue en PDF pour
// la file d'attente "impression centralisée" (documents_impression, voir
// migration 0039) plutôt qu'envoyée par email.
export async function genererPdfQuittance(venteId: string): Promise<{ base64: string; nomFichier: string } | null> {
  const vente = await queryOne<Vente>(
    `SELECT v.created_at, pc.numero AS numero_caisse, e.annee
     FROM ventes v
     JOIN caisses c ON c.id = v.caisse_id
     JOIN postes_caisse pc ON pc.id = c.poste_caisse_id
     JOIN editions e ON e.id = v.edition_id
     WHERE v.id = ?`,
    [venteId],
  );
  if (!vente) return null;

  const lignes = await query<Ligne>(
    `SELECT a.nom, p.numero_vendeur, va.prix_encaisse
     FROM vente_articles va
     JOIN articles a ON a.id = va.article_id
     JOIN participations p ON p.id = a.participation_id
     WHERE va.vente_id = ?
     ORDER BY va.id`,
    [venteId],
  );
  const total = arrondiCentimes(lignes.reduce((sum, l) => sum + Number(l.prix_encaisse), 0));
  const dateVente = new Date(vente.created_at.replace(" ", "T"));

  const doc = new PDFDocument({ size: "A4", margin: MARGE });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const termine = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  doc.fontSize(18).font("Helvetica-Bold").text("Quittance d'achat");
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#666")
    .text(`Troc de la Ludothèque Nyon Région — édition ${vente.annee}`);
  doc.fillColor("#000").moveDown(1);

  doc
    .fontSize(11)
    .text(`Caisse n° ${vente.numero_caisse}`)
    .text(`Date : ${dateVente.toLocaleString("fr-CH")}`);
  doc.moveDown(1.2);

  doc.fontSize(9).fillColor("#666").font("Helvetica-Bold");
  const yEntete = doc.y;
  doc.text("Objet", COL.nom, yEntete);
  doc.text("Vendeur", COL.vendeur, yEntete);
  doc.text("Prix", COL.prix, yEntete);
  doc.font("Helvetica").fillColor("#000");
  doc.moveDown(0.8);
  doc.moveTo(MARGE, doc.y).lineTo(FIN_TABLEAU, doc.y).strokeColor("#ccc").stroke();
  doc.moveDown(0.4);

  doc.fontSize(10);
  for (const l of lignes) {
    const y = doc.y;
    doc.text(l.nom, COL.nom, y, { width: COL.vendeur - COL.nom - 10 });
    doc.text(`n° ${l.numero_vendeur}`, COL.vendeur, y);
    doc.text(formaterMontant(Number(l.prix_encaisse)), COL.prix, y);
    doc.moveDown(0.6);
  }

  doc.moveDown(0.6);
  doc.moveTo(MARGE, doc.y).lineTo(FIN_TABLEAU, doc.y).strokeColor("#ccc").stroke();
  doc.moveDown(0.6);
  doc.fontSize(13).font("Helvetica-Bold").text(`Total : ${formaterMontant(total)}`, MARGE, doc.y, {
    width: FIN_TABLEAU - MARGE,
    align: "right",
  });

  doc.end();
  const buffer = await termine;

  return {
    base64: buffer.toString("base64"),
    nomFichier: `quittance-caisse-${vente.numero_caisse}-${dateVente.toISOString().slice(0, 10)}.pdf`,
  };
}
