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
async function imprimer(cheminPdf, nomImprimante) {
  await imprimerPdf(cheminPdf, {
    printer: nomImprimante,
    sumatraPdfPath: cheminSumatraSpawnable(),
  });
}

module.exports = { imprimer };
