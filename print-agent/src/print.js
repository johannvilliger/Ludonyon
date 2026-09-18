"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { print: imprimerPdf } = require("pdf-to-printer");

// pdf-to-printer embarque son propre SumatraPDF et le résout via __dirname —
// dans un .exe empaqueté (pkg), __dirname pointe dans le système de fichiers
// virtuel du snapshot : lisible via fs, mais pas exécutable par
// spawn/execFile (Windows CreateProcess a besoin d'un vrai fichier sur
// disque). On extrait donc une vraie copie une fois vers un dossier
// temporaire, et on force pdf-to-printer à l'utiliser via sumatraPdfPath.
let cheminSumatraExtrait = null;

function cheminSumatraOriginal() {
  return path.join(
    path.dirname(require.resolve("pdf-to-printer/package.json")),
    "dist",
    "SumatraPDF-3.4.6-32.exe",
  );
}

function cheminSumatraSpawnable() {
  if (cheminSumatraExtrait) return cheminSumatraExtrait;
  const cible = path.join(os.tmpdir(), "print-agent-SumatraPDF-3.4.6-32.exe");
  if (!fs.existsSync(cible)) {
    fs.copyFileSync(cheminSumatraOriginal(), cible);
  }
  cheminSumatraExtrait = cible;
  return cible;
}

// Impression silencieuse (pas de boîte de dialogue) sur l'imprimante déjà
// installée sous ce nom exact dans Windows.
//
// scale: "noscale" — par défaut, SumatraPDF réduit la page pour qu'elle
// tienne dans la taille de support actuellement configurée dans le pilote
// Windows plutôt que d'imprimer plus long. Comme la hauteur du PDF varie
// selon le nombre d'articles (voir ticket-pdf.js), un ticket un peu long se
// retrouvait entièrement dézoomé au lieu d'être imprimé sur une bande plus
// longue. "noscale" force une impression à 100%, taille réelle.
async function imprimer(cheminPdf, nomImprimante) {
  await imprimerPdf(cheminPdf, {
    printer: nomImprimante,
    sumatraPdfPath: cheminSumatraSpawnable(),
    scale: "noscale",
  });
}

module.exports = { imprimer };
