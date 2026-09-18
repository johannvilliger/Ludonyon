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
const LARGEUR_PRIX = 42;
const LARGEUR_NOM = LARGEUR_UTILE - LARGEUR_PRIX;

// Le pilote Windows de la QL-820NWB (hors P-touch Editor) imprime chaque
// page à une longueur FIXE ("Longueur" dans ses préférences d'impression) :
// il ne l'ajuste jamais au contenu et ne la rogne pas automatiquement. Un
// ticket plus long que cette valeur se retrouve découpé sur plusieurs bandes
// physiques par le pilote lui-même, de façon incontrôlée (on perd le début
// ou la fin selon le cas). On évite ça en decoupant nous-mêmes le ticket en
// plusieurs PDF (un par bande), chacun garanti de tenir dans cette longueur,
// avec un en-tête "(suite X/Y)" sur les bandes suivantes — cette longueur
// doit correspondre à ce qui est configuré dans le pilote (longueurMaxMm
// dans config.json).
const LONGUEUR_MAX_MM_DEFAUT = 150;

const HAUTEUR_LOGO = 40;
const HAUTEUR_ENTETE_PREMIER = 40;
const HAUTEUR_ENTETE_SUITE = 20;
const HAUTEUR_PIED = 55;

// Marge de sécurité entre la hauteur mesurée (heightOfString, avant rendu)
// et la hauteur réellement dessinée : sans elle, un segment pile à la limite
// physique du pilote (hauteur de page = somme exacte des hauteurs mesurées,
// zéro marge) peut faire basculer PDFKit dans sa pagination automatique
// interne au moindre écart d'arrondi, ce qui casse la mise en page (texte
// coupé au milieu, montant décalé sur une page fantôme). Réservée à la fois
// lors du découpage en segments et à la fin de chaque page rendue.
const MARGE_SECURITE_PT = 15;

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

// Montant affiché par article = le prix fixé par le vendeur (celui qu'il
// reçoit). prix_encaisse (ce que paie l'acheteur) est ce prix majoré de 10%
// : prix_encaisse = prix_vendeur * (1 + tauxAchat) — voir
// caisse/[numero]/actions.ts, encaisserPanier. On retrouve donc le prix
// vendeur en divisant par (1 + tauxAchat), pas en soustrayant 10% (piège :
// les deux se ressemblent mais ne donnent pas le même résultat).
function calculerLignes(contenu) {
  // PDFKit a besoin d'une instance de document pour mesurer du texte, mais
  // les métriques des polices standards (Helvetica) sont fixes : ce document
  // ne sert qu'à la mesure, jamais écrit sur disque.
  const docMesure = new PDFDocument({ size: [LARGEUR_PT, 200], margin: MARGE_PT });
  docMesure.font("Helvetica").fontSize(8);

  return contenu.articles.map((article) => {
    const montantNet = arrondi2(article.prixEncaisse / (1 + contenu.tauxAchat));
    const hauteur = Math.max(11, docMesure.heightOfString(article.nom, { width: LARGEUR_NOM })) + 3;
    return { nom: article.nom, montantNet, hauteur };
  });
}

// Répartit les lignes d'articles en segments qui tiennent chacun dans
// hauteurMaxPt, en réservant la place du bloc frais/total/pied sur le
// dernier segment (et un segment dédié si même vide d'articles il n'y
// tiendrait pas).
function planifierSegments(lignes, hauteurMaxPt) {
  const budget = hauteurMaxPt - MARGE_SECURITE_PT;
  const segments = [[]];
  let hauteurCourante = MARGE_PT * 2 + HAUTEUR_LOGO + HAUTEUR_ENTETE_PREMIER;

  for (const ligne of lignes) {
    const segmentVide = segments[segments.length - 1].length === 0;
    if (!segmentVide && hauteurCourante + ligne.hauteur > budget) {
      segments.push([]);
      hauteurCourante = MARGE_PT * 2 + HAUTEUR_ENTETE_SUITE;
    }
    segments[segments.length - 1].push(ligne);
    hauteurCourante += ligne.hauteur;
  }

  if (hauteurCourante + HAUTEUR_PIED > budget && segments[segments.length - 1].length > 0) {
    segments.push([]);
  }

  return segments;
}

async function rendreSegment(contenu, lignesSegment, toutesLesLignes, infos, ticketId) {
  const { indexSegment, totalSegments } = infos;
  const estPremier = indexSegment === 0;
  const estDernier = indexSegment === totalSegments - 1;

  const hauteurEntete = estPremier
    ? MARGE_PT * 2 + HAUTEUR_LOGO + HAUTEUR_ENTETE_PREMIER
    : MARGE_PT * 2 + HAUTEUR_ENTETE_SUITE;
  const hauteurArticles = lignesSegment.reduce((somme, l) => somme + l.hauteur, 0);
  const hauteurPied = estDernier ? HAUTEUR_PIED : 0;
  const hauteur = hauteurEntete + hauteurArticles + hauteurPied + MARGE_SECURITE_PT;

  const doc = new PDFDocument({ size: [LARGEUR_PT, hauteur], margin: MARGE_PT });
  const cheminFichier = path.join(os.tmpdir(), `ticket-${ticketId}-${indexSegment + 1}.pdf`);
  const flux = fs.createWriteStream(cheminFichier);
  doc.pipe(flux);

  const suffixeSuite = totalSegments > 1 ? ` (suite ${indexSegment + 1}/${totalSegments})` : "";

  if (estPremier) {
    if (fs.existsSync(CHEMIN_LOGO)) {
      const largeurLogo = LARGEUR_UTILE * 0.8;
      doc.image(CHEMIN_LOGO, MARGE_PT + (LARGEUR_UTILE - largeurLogo) / 2, MARGE_PT, { width: largeurLogo });
      doc.moveDown(4);
    }
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(`Caisse ${contenu.numeroCaisse}${suffixeSuite}`, { width: LARGEUR_UTILE });
    doc
      .font("Helvetica")
      .fontSize(8)
      .text(formaterDate(contenu.dateVente), { width: LARGEUR_UTILE });
  } else {
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(`Caisse ${contenu.numeroCaisse}${suffixeSuite}`, { width: LARGEUR_UTILE });
  }

  doc.moveDown(0.4);
  doc
    .moveTo(MARGE_PT, doc.y)
    .lineTo(MARGE_PT + LARGEUR_UTILE, doc.y)
    .strokeColor("#000000")
    .stroke();
  doc.moveDown(0.4);

  for (const ligne of lignesSegment) {
    const y = doc.y;
    doc.font("Helvetica").fontSize(8).fillColor("#000000");
    doc.text(ligne.nom, MARGE_PT, y, { width: LARGEUR_NOM });
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .text(formaterMontant(ligne.montantNet), MARGE_PT + LARGEUR_NOM, y, { width: LARGEUR_PRIX, align: "right" });
    doc.x = MARGE_PT;
    doc.y = y + ligne.hauteur;
  }

  if (estDernier) {
    doc.moveDown(0.2);
    doc
      .moveTo(MARGE_PT, doc.y)
      .lineTo(MARGE_PT + LARGEUR_UTILE, doc.y)
      .stroke();
    doc.moveDown(0.4);

    const sousTotal = arrondi2(toutesLesLignes.reduce((somme, l) => somme + l.montantNet, 0));
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
  }

  doc.end();
  await new Promise((resolve, reject) => {
    flux.on("finish", resolve);
    flux.on("error", reject);
  });

  return cheminFichier;
}

// Génère un ou plusieurs PDF pour un ticket, dans le dossier temporaire du
// système, et renvoie leurs chemins dans l'ordre d'impression — un seul
// élément dans l'immense majorité des cas, plusieurs seulement si le ticket
// dépasse longueurMaxMm (voir planifierSegments). Jamais réutilisé (voir
// src/index.js, qui supprime les fichiers une fois l'impression tentée).
async function genererTicketsPdf(contenu, ticketId, longueurMaxMm) {
  const hauteurMaxPt = (longueurMaxMm || LONGUEUR_MAX_MM_DEFAUT) * MM_EN_PT;
  const lignes = calculerLignes(contenu);
  const segments = planifierSegments(lignes, hauteurMaxPt);

  const chemins = [];
  for (let i = 0; i < segments.length; i++) {
    const chemin = await rendreSegment(
      contenu,
      segments[i],
      lignes,
      { indexSegment: i, totalSegments: segments.length },
      ticketId,
    );
    chemins.push(chemin);
  }
  return chemins;
}

module.exports = { genererTicketsPdf, LONGUEUR_MAX_MM_DEFAUT };
