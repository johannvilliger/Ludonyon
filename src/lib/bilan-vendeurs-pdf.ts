import "server-only";
import PDFDocument from "pdfkit";
import { formaterMontant } from "@/lib/argent";
import { query, queryOne } from "@/lib/db";

type Edition = { annee: number; taux_vendeur: number };
type VendeurLigne = {
  participation_id: string;
  numero_vendeur: number;
  nom_vendeur: string;
  telephone: string | null;
  email: string | null;
  nb_ventes: number;
  nb_invendus: number;
  montant_du: number;
};
type Article = { participation_id: string; numero_article: number; nom: string; prix: number; statut: string };

const STATUT_LABELS: Record<string, string> = {
  non_recu: "Non reçu",
  recu: "Reçu",
  vendu: "Vendu",
  invendu: "Invendu",
  refuse: "Refusé",
};

// Même requête (mêmes totaux) que l'écran de clôture des vendeurs
// (cloture-vente/page.tsx) : 901/902 exclus, comme sur les étiquettes
// enveloppe — ils ne reçoivent jamais d'argent physique.
async function chargerVendeurs(editionId: string, tauxVendeur: number): Promise<VendeurLigne[]> {
  return query<VendeurLigne>(
    `SELECT
       p.id AS participation_id,
       p.numero_vendeur,
       v.nom AS nom_vendeur,
       v.telephone,
       v.email,
       COALESCE(SUM(CASE WHEN a.statut = 'vendu' THEN 1 ELSE 0 END), 0) AS nb_ventes,
       COALESCE(SUM(CASE WHEN a.statut = 'invendu' THEN 1 ELSE 0 END), 0) AS nb_invendus,
       COALESCE(SUM(CASE WHEN a.statut = 'vendu' THEN
         CASE WHEN p.est_benevole = 1 THEN a.prix ELSE ROUND(a.prix * (1 - ?), 2) END
       ELSE 0 END), 0) AS montant_du
     FROM participations p
     JOIN vendeurs v ON v.id = p.vendeur_id
     LEFT JOIN articles a ON a.participation_id = p.id
     WHERE p.edition_id = ? AND p.numero_vendeur NOT IN (901, 902)
     GROUP BY p.id, p.numero_vendeur, v.nom, v.telephone, v.email, p.est_benevole
     HAVING COUNT(a.id) > 0
     ORDER BY p.numero_vendeur`,
    [tauxVendeur, editionId],
  );
}

const MARGE = 50;
const LARGEUR_PAGE = 595.28; // A4 portrait, points
const COL = { numero: MARGE, nom: MARGE + 40, prix: 400, statut: 460 };
const FIN_TABLEAU = LARGEUR_PAGE - MARGE;

function dessinerEnTeteTableau(doc: PDFKit.PDFDocument) {
  doc.fontSize(9).fillColor("#666").font("Helvetica-Bold");
  const y = doc.y;
  doc.text("N°", COL.numero, y);
  doc.text("Objet", COL.nom, y);
  doc.text("Prix", COL.prix, y);
  doc.text("Statut", COL.statut, y);
  doc.font("Helvetica").fillColor("#000");
  doc.moveDown(0.8);
  doc
    .moveTo(MARGE, doc.y)
    .lineTo(FIN_TABLEAU, doc.y)
    .strokeColor("#ccc")
    .stroke();
  doc.moveDown(0.4);
}

// Génère une page par vendeur : liste de tous ses articles (tous statuts,
// pas seulement vendus) avec le total vendu/invendu et le montant reçu —
// même formule que l'écran de clôture, pour un document à archiver avec
// l'enveloppe de chaque vendeur plutôt que la seule étiquette résumée.
export async function genererPdfClotureVendeurs(editionId: string): Promise<{ base64: string; nomFichier: string }> {
  const edition = await queryOne<Edition>("SELECT annee, taux_vendeur FROM editions WHERE id = ?", [editionId]);
  if (!edition) throw new Error("Édition introuvable.");

  const vendeurs = await chargerVendeurs(editionId, Number(edition.taux_vendeur));
  if (vendeurs.length === 0) throw new Error("Aucun vendeur à inclure dans ce PDF.");

  const articles = await query<Article>(
    `SELECT a.participation_id, a.numero_article, a.nom, a.prix, a.statut
     FROM articles a
     JOIN participations p ON p.id = a.participation_id
     WHERE p.edition_id = ? AND p.numero_vendeur NOT IN (901, 902)
     ORDER BY a.numero_article`,
    [editionId],
  );
  const articlesParVendeur = new Map<string, Article[]>();
  for (const a of articles) {
    const liste = articlesParVendeur.get(a.participation_id) ?? [];
    liste.push(a);
    articlesParVendeur.set(a.participation_id, liste);
  }

  const doc = new PDFDocument({ size: "A4", margin: MARGE });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const termine = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  vendeurs.forEach((v, index) => {
    if (index > 0) doc.addPage();

    doc.fontSize(16).font("Helvetica-Bold").text(`Vendeur #${v.numero_vendeur} — ${v.nom_vendeur}`);
    doc.font("Helvetica").fontSize(9).fillColor("#666").text(`${v.telephone || "—"} · ${v.email || "—"}`);
    doc.fillColor("#000").moveDown(1);

    const nbVentes = Number(v.nb_ventes);
    const nbInvendus = Number(v.nb_invendus);
    doc
      .fontSize(11)
      .text(`${nbVentes} vendu${nbVentes > 1 ? "s" : ""} · ${nbInvendus} invendu${nbInvendus > 1 ? "s" : ""}`);
    doc.fontSize(14).font("Helvetica-Bold").text(`Total reçu : ${formaterMontant(Number(v.montant_du))}`);
    doc.font("Helvetica").moveDown(1);

    dessinerEnTeteTableau(doc);

    const liste = articlesParVendeur.get(v.participation_id) ?? [];
    const largeurNom = COL.prix - COL.nom - 10;
    doc.fontSize(9);
    for (const a of liste) {
      // Passage à la page suivante avant la ligne si elle n'entre plus,
      // avec un nouvel en-tête de tableau pour rester lisible.
      const hauteurLigne = Math.max(doc.heightOfString(a.nom, { width: largeurNom }), 12);
      if (doc.y + hauteurLigne > doc.page.height - MARGE) {
        doc.addPage();
        doc.fontSize(9);
        dessinerEnTeteTableau(doc);
      }

      const y = doc.y;
      doc.text(String(a.numero_article).padStart(2, "0"), COL.numero, y);
      doc.text(a.nom, COL.nom, y, { width: largeurNom });
      doc.text(`${a.prix}.–`, COL.prix, y);
      doc.text(STATUT_LABELS[a.statut] ?? a.statut, COL.statut, y);
      doc.y = y + hauteurLigne + 4;
    }
  });

  doc.end();
  const buffer = await termine;

  return {
    base64: buffer.toString("base64"),
    nomFichier: `cloture-vendeurs-${edition.annee}.pdf`,
  };
}
