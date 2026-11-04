"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

// Toute la géométrie ci-dessous est recopiée de src/app/globals.css (planche
// Herma 4357) et des composants src/components/EtiquetteArticleNom.tsx /
// EtiquetteTexteSeul.tsx — à modifier ICI EN MÊME TEMPS que là-bas si la
// planche ou la mise en page changent un jour, sous peine de désynchroniser
// l'aperçu navigateur (accueil) et l'impression centralisée (ce fichier).
const MM_EN_PT = 2.83464567;
const pt = (mmValeur) => mmValeur * MM_EN_PT;

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
const QR_MM = 8.5;
const LOGO_INLINE_MM = 3.7;
const LOGO_CONTACT_MM = 5;

// Bandes haute/basse de l'étiquette normale (voir label__row et
// label__row--bottom) : la bande du milieu (prix) occupe le reste —
// l'exacte répartition flexbox du navigateur n'est pas reproduite à la
// perfection, mais ces deux bandes sont dimensionnées sur leur contenu
// dominant (logo 3.7mm en haut, QR 8.5mm en bas), comme en CSS.
const BANDE_HAUT_MM = LOGO_INLINE_MM;
const BANDE_BAS_MM = QR_MM;

const NOM_TAILLE_MAX_MM = 3.4;
const NOM_TAILLE_MIN_MM = 2.2;
const NOM_LARGEUR_MM = 34.6;
const NOM_LIGNE_HAUTEUR = 1.08;

const TEXTE_SEUL_TAILLE_MAX_MM = 4;
const TEXTE_SEUL_TAILLE_MIN_MM = 2.2;
const TEXTE_SEUL_LARGEUR_MM = 44.1;
const TEXTE_SEUL_HAUTEUR_UTILE_MM = 15;
const TEXTE_SEUL_LIGNE_HAUTEUR = 1.12;

const CHEMIN_LOGO_MEEPLE = path.join(__dirname, "..", "assets", "meeple.png");
const LOGO_DISPONIBLE = fs.existsSync(CHEMIN_LOGO_MEEPLE);

function formaterPrix(prix) {
  return `${prix}.–`;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

// Largeur réelle d'un texte à une taille donnée (mm), via les métriques de
// police de PDFKit — même principe que la mesure Canvas côté navigateur
// (voir lib/etiquette-texte-mesure.ts), Helvetica-Bold étant la police
// standard la plus proche d'Arial 700 disponible sans police embarquée.
function largeurTexteMm(doc, texte, tailleMm, police) {
  return doc.font(police).fontSize(pt(tailleMm)).widthOfString(texte) / MM_EN_PT;
}

function envelopperTexte(doc, texte, tailleMm, largeurMm, police) {
  const mots = texte.split(" ");
  const lignes = [];
  let ligne = "";
  for (const mot of mots) {
    const essai = ligne ? `${ligne} ${mot}` : mot;
    if (ligne && largeurTexteMm(doc, essai, tailleMm, police) > largeurMm) {
      lignes.push(ligne);
      ligne = mot;
    } else {
      ligne = essai;
    }
  }
  if (ligne) lignes.push(ligne);
  return lignes;
}

function tronquerAvecEllipse(doc, texte, tailleMm, largeurMm, police) {
  let t = texte;
  while (t.length > 1 && largeurTexteMm(doc, `${t}…`, tailleMm, police) > largeurMm) {
    t = t.slice(0, -1);
  }
  return `${t}…`;
}

// Réplique EtiquetteArticleNom.tsx : rétrécit jusqu'à NOM_TAILLE_MIN_MM tant
// que le texte ne tient pas sur une ligne, puis renvoie au plus 2 lignes
// (coupure avec « … » sur la 2e si ça ne suffit toujours pas — équivalent
// de -webkit-line-clamp:2).
function calculerNomArticle(doc, nom) {
  let taille = NOM_TAILLE_MAX_MM;
  while (taille > NOM_TAILLE_MIN_MM && largeurTexteMm(doc, nom, taille, "Helvetica-Bold") > NOM_LARGEUR_MM) {
    taille = Math.round((taille - 0.1) * 10) / 10;
  }
  const toutes = envelopperTexte(doc, nom, taille, NOM_LARGEUR_MM, "Helvetica-Bold");
  let lignes = toutes;
  if (toutes.length > 2) {
    const reste = toutes.slice(1).join(" ");
    lignes = [toutes[0], tronquerAvecEllipse(doc, reste, taille, NOM_LARGEUR_MM, "Helvetica-Bold")];
  }
  return { taille, lignes };
}

// Réplique EtiquetteTexteSeul.tsx.
function calculerTexteSeul(doc, nom) {
  let taille = TEXTE_SEUL_TAILLE_MAX_MM;
  let lignes = envelopperTexte(doc, nom, taille, TEXTE_SEUL_LARGEUR_MM, "Helvetica-Bold");
  while (
    taille > TEXTE_SEUL_TAILLE_MIN_MM &&
    lignes.length * taille * TEXTE_SEUL_LIGNE_HAUTEUR > TEXTE_SEUL_HAUTEUR_UTILE_MM
  ) {
    taille = Math.round((taille - 0.1) * 10) / 10;
    lignes = envelopperTexte(doc, nom, taille, TEXTE_SEUL_LARGEUR_MM, "Helvetica-Bold");
  }
  return { taille, lignes };
}

// Dessine un QR code en traçant ses modules directement (pas de rendu SVG :
// PDFKit n'en a pas), même contenu que la route Next.js (voir
// accueil/vendeur/[code]/etiquettes/page.tsx) : "<vendeur>-<article>-<prix>".
function dessinerQr(doc, texte, xMm, yMm, tailleMm) {
  const qr = QRCode.create(texte, { errorCorrectionLevel: "M" });
  const taille = qr.modules.size;
  const margeModules = 1; // même marge que `margin: 1` côté serveur Next.js
  const totalModules = taille + margeModules * 2;
  const moduleMm = tailleMm / totalModules;
  // Léger chevauchement entre modules adjacents pour ne pas laisser de
  // liseré blanc dû à l'arrondi pt — sans conséquence sur la lecture du QR.
  const chevauchementPt = 0.4;

  doc.rect(pt(xMm), pt(yMm), pt(tailleMm), pt(tailleMm)).fill("#ffffff");
  doc.fillColor("#000000");
  for (let ligne = 0; ligne < taille; ligne++) {
    for (let colonne = 0; colonne < taille; colonne++) {
      if (qr.modules.get(ligne, colonne)) {
        const mx = xMm + (colonne + margeModules) * moduleMm;
        const my = yMm + (ligne + margeModules) * moduleMm;
        doc.rect(pt(mx), pt(my), pt(moduleMm) + chevauchementPt, pt(moduleMm) + chevauchementPt).fill("#000000");
      }
    }
  }
}

function dessinerEtiquetteContact(doc, contenu, xMm, yMm) {
  const innerX = xMm + PAD_MM;
  let y = yMm + PAD_MM;

  doc
    .font("Helvetica-Bold")
    .fontSize(pt(3.6))
    .fillColor(contenu.special ? "#2e9fd6" : "#101010")
    .text(`#${contenu.numeroVendeur}`, pt(innerX), pt(y), { lineBreak: false });
  y += 3.6 + 1;

  doc
    .font("Helvetica-Bold")
    .fontSize(pt(3.4))
    .fillColor("#101010")
    .text(contenu.nomVendeur, pt(innerX), pt(y), { width: pt(CELL_LARGEUR_MM - 2 * PAD_MM), lineBreak: false });
  y += 3.4 * 1.15 + 1;

  doc
    .font("Helvetica")
    .fontSize(pt(3))
    .fillColor("#444444")
    .text(contenu.telephone || "—", pt(innerX), pt(y), { lineBreak: false });

  if (LOGO_DISPONIBLE) {
    const taille = LOGO_CONTACT_MM;
    doc.image(
      CHEMIN_LOGO_MEEPLE,
      pt(xMm + CELL_LARGEUR_MM - 1.5 - taille),
      pt(yMm + CELL_HAUTEUR_MM - 1.5 - taille),
      { width: pt(taille), height: pt(taille) },
    );
  }
}

function dessinerEtiquetteArticle(doc, contenu, caseArticle, xMm, yMm) {
  const innerX = xMm + PAD_MM;
  const innerLargeur = CELL_LARGEUR_MM - 2 * PAD_MM;
  let y = yMm + PAD_MM;

  // Bande haute : logo + n° vendeur à gauche, "art. XX" à droite.
  if (LOGO_DISPONIBLE) {
    doc.image(CHEMIN_LOGO_MEEPLE, pt(innerX), pt(y), { width: pt(LOGO_INLINE_MM), height: pt(LOGO_INLINE_MM) });
  }
  doc
    .font("Helvetica-Bold")
    .fontSize(pt(3.6))
    .fillColor(contenu.special ? "#2e9fd6" : "#101010")
    .text(
      String(contenu.numeroVendeur),
      pt(innerX + (LOGO_DISPONIBLE ? LOGO_INLINE_MM + 0.8 : 0)),
      pt(y + (LOGO_INLINE_MM - 3.6) / 2),
      { lineBreak: false },
    );
  const texteItem = `art. ${pad2(caseArticle.numeroArticle)}`;
  const largeurItem = largeurTexteMm(doc, texteItem, 2.2, "Courier");
  doc
    .font("Courier")
    .fontSize(pt(2.2))
    .fillColor("#8a8a8a")
    .text(texteItem, pt(innerX + innerLargeur - largeurItem), pt(y + (LOGO_INLINE_MM - 2.2) / 2), {
      lineBreak: false,
    });

  // Bande basse : nom (bas-gauche, jusqu'à 2 lignes) + QR (bas-droite).
  const yBande = yMm + CELL_HAUTEUR_MM - PAD_MM - BANDE_BAS_MM;
  const { taille: tailleNom, lignes: lignesNom } = calculerNomArticle(doc, caseArticle.nom);
  const hauteurLigneNom = tailleNom * NOM_LIGNE_HAUTEUR;
  const yNomDepart = yMm + CELL_HAUTEUR_MM - PAD_MM - lignesNom.length * hauteurLigneNom;
  doc.font("Helvetica-Bold").fontSize(pt(tailleNom)).fillColor("#101010");
  lignesNom.forEach((ligneTexte, i) => {
    doc.text(ligneTexte, pt(innerX), pt(yNomDepart + i * hauteurLigneNom), {
      width: pt(NOM_LARGEUR_MM),
      lineBreak: false,
    });
  });

  const xQr = xMm + CELL_LARGEUR_MM - PAD_MM - QR_MM;
  dessinerQr(doc, `${contenu.numeroVendeur}-${pad2(caseArticle.numeroArticle)}-${caseArticle.prix}`, xQr, yBande, QR_MM);

  // Prix : occupe la bande du milieu, centré.
  const yPrixHaut = yMm + PAD_MM + BANDE_HAUT_MM;
  const hauteurBandePrix = CELL_HAUTEUR_MM - 2 * PAD_MM - BANDE_HAUT_MM - BANDE_BAS_MM;
  const texte = formaterPrix(caseArticle.prix);
  const largeurPrix = largeurTexteMm(doc, texte, 8, "Helvetica-Bold");
  doc
    .font("Helvetica-Bold")
    .fontSize(pt(8))
    .fillColor("#101010")
    .text(
      texte,
      pt(xMm + CELL_LARGEUR_MM / 2 - largeurPrix / 2),
      pt(yPrixHaut + (hauteurBandePrix - 8) / 2),
      { lineBreak: false },
    );
}

function dessinerEtiquetteTexteSeul(doc, caseTexte, xMm, yMm) {
  const innerX = xMm + PAD_MM;
  let y = yMm + PAD_MM;

  if (LOGO_DISPONIBLE) {
    doc.image(CHEMIN_LOGO_MEEPLE, pt(innerX), pt(y), { width: pt(5), height: pt(5) });
  }
  y += 5 + 1;

  const { taille, lignes } = calculerTexteSeul(doc, caseTexte.nom);
  const hauteurLigne = taille * TEXTE_SEUL_LIGNE_HAUTEUR;
  doc.font("Helvetica-Bold").fontSize(pt(taille)).fillColor("#101010");
  lignes.forEach((ligneTexte, i) => {
    doc.text(ligneTexte, pt(innerX), pt(y + i * hauteurLigne), {
      width: pt(TEXTE_SEUL_LARGEUR_MM),
      lineBreak: false,
    });
  });
}

// Génère le PDF complet (toutes les feuilles nécessaires, en pages
// successives d'un même document — contrairement aux tickets, une feuille
// A4 n'a pas besoin d'être découpée) et renvoie son chemin dans le dossier
// temporaire du système.
async function genererEtiquettesPdf(contenu, feuilleId) {
  const doc = new PDFDocument({ size: [pt(PAGE_LARGEUR_MM), pt(PAGE_HAUTEUR_MM)], margin: 0 });
  const cheminFichier = path.join(os.tmpdir(), `etiquettes-${feuilleId}.pdf`);
  const flux = fs.createWriteStream(cheminFichier);
  doc.pipe(flux);

  // 1re feuille : la case 0 est prise par l'étiquette coordonnées (même
  // règle que etiquettes-vendeur.tsx : NB_ETIQUETTES - 1 cases pour les
  // articles). Feuilles suivantes : pleines, toutes les cases pour les
  // articles.
  const pages = [];
  let reste = contenu.cases;
  pages.push({ avecContact: true, cases: reste.slice(0, NB_ETIQUETTES - 1) });
  reste = reste.slice(NB_ETIQUETTES - 1);
  while (reste.length > 0) {
    pages.push({ avecContact: false, cases: reste.slice(0, NB_ETIQUETTES) });
    reste = reste.slice(NB_ETIQUETTES);
  }

  pages.forEach((page, indexPage) => {
    if (indexPage > 0) doc.addPage({ size: [pt(PAGE_LARGEUR_MM), pt(PAGE_HAUTEUR_MM)], margin: 0 });

    let indexCase = 0;
    if (page.avecContact) {
      dessinerEtiquetteContact(doc, contenu, MARGE_GAUCHE_MM, MARGE_HAUT_MM);
      indexCase = 1;
    }

    for (const c of page.cases) {
      const colonne = indexCase % COLONNES;
      const ligne = Math.floor(indexCase / COLONNES);
      const xMm = MARGE_GAUCHE_MM + colonne * CELL_LARGEUR_MM;
      const yMm = MARGE_HAUT_MM + ligne * CELL_HAUTEUR_MM;
      if (c.type === "texte") {
        dessinerEtiquetteTexteSeul(doc, c, xMm, yMm);
      } else {
        dessinerEtiquetteArticle(doc, contenu, c, xMm, yMm);
      }
      indexCase++;
    }
  });

  doc.end();
  await new Promise((resolve, reject) => {
    flux.on("finish", resolve);
    flux.on("error", reject);
  });

  return cheminFichier;
}

module.exports = { genererEtiquettesPdf, NB_ETIQUETTES };
