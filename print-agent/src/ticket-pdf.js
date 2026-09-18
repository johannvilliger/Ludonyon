"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const PDFDocument = require("pdfkit");

// Rouleau continu 54mm : largeur fixe, longueur variable selon le nombre
// d'articles — la bonne media pour un ticket, à l'inverse d'une étiquette
// découpée à taille fixe (voir migration 0024).
const MM_EN_PT = 2.83464567;
const LARGEUR_MM = 54;
const LARGEUR_PT = LARGEUR_MM * MM_EN_PT;
const MARGE_PT = 6;
const LARGEUR_UTILE = LARGEUR_PT - MARGE_PT * 2;

const CHEMIN_LOGO = path.join(__dirname, "..", "assets", "logo.png");

function formaterMontant(centimesFrancs) {
  return `${centimesFrancs.toFixed(2)}.–`.replace(".00.–", ".–");
}

function arrondi2(valeur) {
  return Math.round(valeur * 100) / 100;
}

function pad2(nombre) {
  return String(nombre).padStart(2, "0");
}

// Formatage manuel (pas de toLocaleString/Intl) : le Node embarqué par pkg
// dans le .exe est compilé en "small-icu" (données anglaises uniquement) —
// demander un formatage fr-CH avec dateStyle/timeStyle y produit un rendu
// corrompu (ex. "16 %Minute:21%$" au lieu de "16:21"). Un formatage manuel
// est indépendant de l'ICU embarquée et fonctionne de manière identique
// partout.
function formaterDate(iso) {
  const d = new Date(iso);
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// Hauteur estimée AVANT de dessiner (PDFKit fixe la taille de page à la
// création, impossible de l'agrandir après coup) : logo + en-tête + une
// ligne par article + bloc frais/total + bas de page, avec la même marge
// que la largeur.
function hauteurEstimee(contenu) {
  const hauteurLogo = 40;
  const enTete = 40;
  const ligneParArticle = 24;
  const pied = 100;
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

  // Montant affiché par article = ce que le vendeur reçoit (prix encaissé
  // moins la part de frais de fonctionnement) ; les frais sont ensuite
  // affichés une seule fois, regroupés, en dessous de la liste — plus lisible
  // qu'un pourcentage répété ligne par ligne.
  const largeurPrix = 42;
  const largeurNom = LARGEUR_UTILE - largeurPrix;
  const articlesAvecMontantNet = contenu.articles.map((article) => ({
    nom: article.nom,
    montantNet: arrondi2(article.prixEncaisse * (1 - contenu.tauxAchat)),
  }));

  for (const article of articlesAvecMontantNet) {
    const y = doc.y;
    doc.font("Helvetica").fontSize(8).fillColor("#000000");
    const hauteurLigne = Math.max(11, doc.heightOfString(article.nom, { width: largeurNom }));
    doc.text(article.nom, MARGE_PT, y, { width: largeurNom });
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .text(formaterMontant(article.montantNet), MARGE_PT + largeurNom, y, {
        width: largeurPrix,
        align: "right",
      });
    doc.x = MARGE_PT;
    doc.y = y + hauteurLigne + 3;
  }

  doc.moveDown(0.2);
  doc
    .moveTo(MARGE_PT, doc.y)
    .lineTo(MARGE_PT + LARGEUR_UTILE, doc.y)
    .stroke();
  doc.moveDown(0.4);

  const sousTotal = arrondi2(articlesAvecMontantNet.reduce((somme, a) => somme + a.montantNet, 0));
  const frais = arrondi2(contenu.total - sousTotal);
  const pourcent = Math.round(contenu.tauxAchat * 100);

  doc.x = MARGE_PT;
  doc
    .font("Helvetica")
    .fontSize(7.5)
    .fillColor("#000000")
    .text(`Frais de fonctionnement (${pourcent}%) : ${formaterMontant(frais)}`, { width: LARGEUR_UTILE });
  doc.moveDown(0.5);

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(`Total : ${formaterMontant(contenu.total)}`, { width: LARGEUR_UTILE });

  doc.moveDown(0.6);
  doc.font("Helvetica").fontSize(8).fillColor("#000000").text("Merci de votre visite !", { width: LARGEUR_UTILE });

  doc.end();

  await new Promise((resolve, reject) => {
    flux.on("finish", resolve);
    flux.on("error", reject);
  });

  return cheminFichier;
}

module.exports = { genererTicketPdf };
