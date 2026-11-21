import "server-only";
import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import { formaterMontant } from "@/lib/argent";
import { query, queryOne } from "@/lib/db";

// Géométrie Herma 4357 — dupliquée de src/app/globals.css et de
// print-agent/src/etiquettes-pdf.js (même planche, voir leurs commentaires) :
// à modifier ICI EN MÊME TEMPS si l'une des trois change. Générée ici plutôt
// que reconstruite par print-agent (contrairement aux étiquettes articles) :
// un document rare, qu'on préfère garder simple à faire évoluer sans
// reconstruire un nouveau .exe à chaque ajustement visuel.
const MM_EN_PT = 2.83464567;
const pt = (mm: number) => mm * MM_EN_PT;

const PAGE_LARGEUR_MM = 210;
const PAGE_HAUTEUR_MM = 297;
const MARGE_HAUT_MM = 21.5;
const MARGE_GAUCHE_MM = 8;
const CELL_LARGEUR_MM = 48.5;
const CELL_HAUTEUR_MM = 25.4;
const COLONNES = 4;
const LIGNES = 10;
const NB_ETIQUETTES = COLONNES * LIGNES; // 40
const PAD_MM = 2.2;
const LOGO_MM = 5;

const CHEMIN_LOGO_MEEPLE = path.join(process.cwd(), "public", "meeple.png");
const LOGO_DISPONIBLE = fs.existsSync(CHEMIN_LOGO_MEEPLE);

type VendeurCloture = {
  numero_vendeur: number;
  nom_vendeur: string;
  nb_ventes: number;
  nb_invendus: number;
  montant_du: number;
};

function dessinerEtiquetteCloture(doc: PDFKit.PDFDocument, v: VendeurCloture, xMm: number, yMm: number) {
  const innerX = xMm + PAD_MM;
  let y = yMm + PAD_MM;

  doc
    .font("Helvetica-Bold")
    .fontSize(pt(3.6))
    .fillColor("#101010")
    .text(`#${v.numero_vendeur}`, pt(innerX), pt(y), { lineBreak: false });
  y += 3.6 + 0.8;

  doc
    .font("Helvetica-Bold")
    .fontSize(pt(3.4))
    .fillColor("#101010")
    .text(v.nom_vendeur, pt(innerX), pt(y), { width: pt(CELL_LARGEUR_MM - 2 * PAD_MM), lineBreak: false });
  y += 3.4 * 1.15 + 0.8;

  const nbVentes = Number(v.nb_ventes);
  const nbInvendus = Number(v.nb_invendus);
  doc
    .font("Helvetica")
    .fontSize(pt(2.6))
    .fillColor("#444444")
    .text(
      `${nbVentes} vendu${nbVentes > 1 ? "s" : ""} · ${nbInvendus} invendu${nbInvendus > 1 ? "s" : ""}`,
      pt(innerX),
      pt(y),
      { lineBreak: false },
    );
  y += 2.6 + 1;

  doc
    .font("Helvetica-Bold")
    .fontSize(pt(5))
    .fillColor("#101010")
    .text(`Dû : ${formaterMontant(Number(v.montant_du))}`, pt(innerX), pt(y), { lineBreak: false });

  if (LOGO_DISPONIBLE) {
    doc.image(
      CHEMIN_LOGO_MEEPLE,
      pt(xMm + CELL_LARGEUR_MM - 1.5 - LOGO_MM),
      pt(yMm + CELL_HAUTEUR_MM - 1.5 - LOGO_MM),
      { width: pt(LOGO_MM), height: pt(LOGO_MM) },
    );
  }
}

// Même requête que l'écran de clôture (cloture-vente/page.tsx) : 901/902
// exclus, ils ne reçoivent jamais d'argent physique donc pas d'étiquette
// enveloppe. Génère une planche A4 continue (40 étiquettes/page, sans case
// réservée comme pour les étiquettes articles) avec un saut de page propre
// toutes les 40 étiquettes — contrairement à l'écran actuel (grille CSS
// continue imprimée via le navigateur), qui ne réapplique jamais la marge
// de la planche au-delà de la 1re feuille A4.
export async function genererPdfEtiquettesCloture(
  editionId: string,
  plage?: { debut: number; fin: number },
): Promise<{ base64: string; nomFichier: string }> {
  const edition = await queryOne<{ annee: number; taux_vendeur: number }>(
    "SELECT annee, taux_vendeur FROM editions WHERE id = ?",
    [editionId],
  );
  if (!edition) throw new Error("Édition introuvable.");

  // 901/902 (Ludothèque, Dons Ludothèque) inclus — jamais rien ne leur est
  // dû (voir estVendeurSpecial), d'où le cas particulier dans montant_du
  // plutôt qu'une exclusion de la liste.
  const vendeurs = await query<VendeurCloture>(
    `SELECT
       p.numero_vendeur,
       v.nom AS nom_vendeur,
       COALESCE(SUM(CASE WHEN a.statut = 'vendu' THEN 1 ELSE 0 END), 0) AS nb_ventes,
       COALESCE(SUM(CASE WHEN a.statut = 'invendu' THEN 1 ELSE 0 END), 0) AS nb_invendus,
       COALESCE(SUM(CASE WHEN a.statut = 'vendu' THEN
         CASE
           WHEN p.numero_vendeur IN (901, 902) THEN 0
           WHEN p.est_benevole = 1 THEN a.prix
           ELSE ROUND(a.prix * (1 - ?), 2)
         END
       ELSE 0 END), 0) AS montant_du
     FROM participations p
     JOIN vendeurs v ON v.id = p.vendeur_id
     LEFT JOIN articles a ON a.participation_id = p.id
     WHERE p.edition_id = ? AND p.absent = 0
       ${plage ? "AND p.numero_vendeur BETWEEN ? AND ?" : ""}
     GROUP BY p.id, p.numero_vendeur, v.nom, p.est_benevole
     HAVING COUNT(a.id) > 0
     ORDER BY p.numero_vendeur`,
    plage ? [Number(edition.taux_vendeur), editionId, plage.debut, plage.fin] : [Number(edition.taux_vendeur), editionId],
  );
  if (vendeurs.length === 0) throw new Error("Aucun vendeur à inclure dans ces étiquettes.");

  const doc = new PDFDocument({ size: [pt(PAGE_LARGEUR_MM), pt(PAGE_HAUTEUR_MM)], margin: 0 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const termine = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  vendeurs.forEach((v, index) => {
    const indexSurPage = index % NB_ETIQUETTES;
    if (index > 0 && indexSurPage === 0) {
      doc.addPage({ size: [pt(PAGE_LARGEUR_MM), pt(PAGE_HAUTEUR_MM)], margin: 0 });
    }

    const colonne = indexSurPage % COLONNES;
    const ligne = Math.floor(indexSurPage / COLONNES);
    const xMm = MARGE_GAUCHE_MM + colonne * CELL_LARGEUR_MM;
    const yMm = MARGE_HAUT_MM + ligne * CELL_HAUTEUR_MM;
    dessinerEtiquetteCloture(doc, v, xMm, yMm);
  });

  doc.end();
  const buffer = await termine;

  return {
    base64: buffer.toString("base64"),
    nomFichier: plage
      ? `etiquettes-cloture-${edition.annee}-${plage.debut}-${plage.fin}.pdf`
      : `etiquettes-cloture-${edition.annee}.pdf`,
  };
}
