"use strict";

const fs = require("fs");
const path = require("path");
const { genererTicketPdf } = require("./ticket-pdf");
const { imprimer } = require("./print");

// Dans un .exe empaqueté (voir pkg dans package.json), __dirname pointe
// dans le système de fichiers virtuel du snapshot — config.json doit être
// lu à côté du VRAI .exe (process.execPath), jamais embarqué dedans,
// puisqu'il contient le secret de ce poste et doit rester modifiable après
// la construction du .exe.
function dossierExecutable() {
  return process.pkg ? path.dirname(process.execPath) : path.join(__dirname, "..");
}

function chargerConfig() {
  const chemin = path.join(dossierExecutable(), "config.json");
  if (!fs.existsSync(chemin)) {
    console.error(
      `Fichier config.json introuvable (${chemin}).\n` +
        "Copiez config.example.json vers config.json à côté de l'exécutable et remplissez-le " +
        "(adresse du site, code print-agent depuis le dashboard, nom exact de l'imprimante).",
    );
    process.exit(1);
  }
  const config = JSON.parse(fs.readFileSync(chemin, "utf8"));
  for (const champ of ["siteUrl", "codeImpression", "printerName"]) {
    if (!config[champ]) {
      console.error(`config.json : le champ "${champ}" est manquant ou vide.`);
      process.exit(1);
    }
  }
  return config;
}

async function recupererTicketsEnAttente(config) {
  const reponse = await fetch(`${config.siteUrl.replace(/\/$/, "")}/api/etiquettes/en-attente`, {
    headers: { "X-Code-Impression": config.codeImpression },
  });
  if (!reponse.ok) {
    throw new Error(`GET /api/etiquettes/en-attente a répondu ${reponse.status}`);
  }
  const donnees = await reponse.json();
  return donnees.tickets;
}

async function marquerStatut(config, id, statut) {
  await fetch(`${config.siteUrl.replace(/\/$/, "")}/api/etiquettes/${id}/statut`, {
    method: "POST",
    headers: { "X-Code-Impression": config.codeImpression, "Content-Type": "application/json" },
    body: JSON.stringify({ statut }),
  });
}

async function traiterUnTour(config) {
  let tickets;
  try {
    tickets = await recupererTicketsEnAttente(config);
  } catch (err) {
    console.error("Erreur de récupération des tickets en attente :", err.message);
    return;
  }

  for (const ticket of tickets) {
    console.log(`Ticket ${ticket.id} (caisse ${ticket.contenu.numeroCaisse}) — impression…`);
    let cheminPdf = null;
    try {
      cheminPdf = await genererTicketPdf(ticket.contenu, ticket.id);
      await imprimer(cheminPdf, config.printerName);
      await marquerStatut(config, ticket.id, "imprimee");
      console.log("  -> imprimé.");
    } catch (err) {
      console.error("  -> échec :", err && err.message ? err.message : String(err));
      await marquerStatut(config, ticket.id, "echec").catch(() => {});
    } finally {
      if (cheminPdf) fs.unlink(cheminPdf, () => {});
    }
  }
}

async function boucle(config) {
  // Intentionnellement infinie : ce programme est fait pour tourner sans
  // surveillance toute la durée du troc, jamais un run-once.
  for (;;) {
    await traiterUnTour(config);
    await new Promise((resolve) => setTimeout(resolve, config.pollIntervalMs || 5000));
  }
}

async function main() {
  const config = chargerConfig();
  console.log(`print-agent démarré — site : ${config.siteUrl} — imprimante : ${config.printerName}`);
  await boucle(config);
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  process.exit(1);
});
