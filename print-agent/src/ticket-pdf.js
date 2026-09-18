"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const PDFDocument = require("pdfkit");

// Bande continue 62mm (DK-22205 et équivalents) : largeur fixe, longueur
// variable selon le nombre d'articles — la bonne media pour un ticket, à
// l'inverse d'une étiquette découpée à taille fixe (voir migration 0024).
const MM_EN_PT = 2.83464567;
const LARGEUR_MM = 62;
const LARGEUR_PT = LARGEUR_MM * MM_EN_PT;
const MARGE_PT = 8;
const LARGEUR_UTILE = LARGEUR_PT - MARGE_PT * 2;

const CHEMIN_LOGO = path.join(__dirname, "..", "assets", "logo.png");

function formaterMontant(centimesFrancs) {
  return `${centimesFrancs.toFixed(2)}.–`.replace(".00.–", ".–");
}

function formaterDate(iso) {
  return new Date(iso).toLocaleString("fr-CH", { dateStyle: "short", timeStyle: "short" });
}

// Hauteur estimée AVANT de dessiner (PDFKit fixe la taille de page à la
// création, impossible de l'agrandir après coup) : logo + en-tête + 2
// lignes par article + total + bas de page, avec la même marge que la
// largeur.
function hauteurEstimee(contenu) {
  const hauteurLogo = 40;
  const enTete = 46;
  const ligneParArticle = 26;
  const pied = 70;
  return (
    MARGE_PT * 2 +
    hauteurLogo +
    enTete +
    contenu.articles.length * ligneParArticle +
    pied
  );
}

// Génère le PDF du ticket dans le dossier temporaire du système et renvoie
// son chemin — appelé une fois par ticket, jamais réutilisé (voir
// src/index.js, qui supprime le fichier une fois l'impression tentée).
async function genererTicketPdf(contenu, ticketId) {
  const hauteur = hauteurEstimee(contenu);
  const doc = new PDFDocument({ size: [LARGEUR_PT, hauteur], margin: MARGE_PT });

  const cheminFichier = path.join(os.tmpdir(), `ticket-${ticketId}.pdf`);
  const flux = fs.createWriteStream(cheminFichier);
  doc.pipe(flux);

  if (fs.existsSync(CHEMIN_LOGO)) {
    const largeurLogo = LARGEUR_UTILE * 0.8;
    doc.image(CHEMIN_LOGO, MARGE_PT + (LARGEUR_UTILE - largeurLogo) / 2, MARGE_PT, { width: largeurLogo });
    doc.moveDown(4);
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(`Caisse ${contenu.numeroCaisse}`, { width: LARGEUR_UTILE });
  doc
    .font("Helvetica")
    .fontSize(8)
    .text(formaterDate(contenu.dateVente), { width: LARGEUR_UTILE });

  doc.moveDown(0.4);
  doc
    .moveTo(MARGE_PT, doc.y)
    .lineTo(MARGE_PT + LARGEUR_UTILE, doc.y)
    .strokeColor("#000000")
    .stroke();
  doc.moveDown(0.4);

  for (const article of contenu.articles) {
    doc.font("Helvetica").fontSize(8).text(article.nom, { width: LARGEUR_UTILE });
    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor("#444444")
      .text(`vendeur n° ${article.numeroVendeur}`, { continued: false, width: LARGEUR_UTILE - 50 });
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor("#000000")
      .text(formaterMontant(article.prixEncaisse), MARGE_PT, doc.y - 10, {
        width: LARGEUR_UTILE,
        align: "right",
      });
    doc.moveDown(0.3);
  }

  doc.moveDown(0.2);
  doc
    .moveTo(MARGE_PT, doc.y)
    .lineTo(MARGE_PT + LARGEUR_UTILE, doc.y)
    .stroke();
  doc.moveDown(0.4);

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(`Total : ${formaterMontant(contenu.total)}`, { width: LARGEUR_UTILE });

  doc.moveDown(0.6);
  const pourcent = Math.round(contenu.tauxAchat * 100);
  doc
    .font("Helvetica")
    .fontSize(6.5)
    .fillColor("#444444")
    .text(`Dont ${pourcent}% de frais de fonctionnement du troc.`, { width: LARGEUR_UTILE });
  doc.moveDown(0.4);
  doc.text("Merci de votre visite !", { width: LARGEUR_UTILE });

  doc.end();

  await new Promise((resolve, reject) => {
    flux.on("finish", resolve);
    flux.on("error", reject);
  });

  return cheminFichier;
}

module.exports = { genererTicketPdf };
