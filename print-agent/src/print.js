"use strict";

const { print: imprimerPdf } = require("pdf-to-printer");

// Impression silencieuse (pas de boîte de dialogue) sur l'imprimante déjà
// installée sous ce nom exact dans Windows — pdf-to-printer s'appuie sur
// SumatraPDF (fourni avec le paquet) pour ça, Windows uniquement.
async function imprimer(cheminPdf, nomImprimante) {
  await imprimerPdf(cheminPdf, { printer: nomImprimante });
}

module.exports = { imprimer };
