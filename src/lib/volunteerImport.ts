import { getAvailabilityOptions } from "@/lib/planning";
import type { Poste } from "@/lib/postes";

// Import groupé de bénévoles à partir d'un copié-collé de cellules Excel
// (voir Espace organisation > Bénévoles > Import groupé). Colonnes
// attendues, dans cet ordre, séparées par des tabulations (ce que produit
// un copier-coller depuis Excel) :
//   PRÉNOM | NOM | MOBILE | E MAIL | NIVEAU | JOURS | FRÉQUENCE
//
// NIVEAU -> poste (hiérarchie src/lib/postes.ts) :
//   2 = Accueil, 3 = Poste retour, 4 = Poste sortie.
//   0, 1, "0+", vide ou non reconnu = pas formé aux ouvertures : le poste
//   n'est PAS déduit et les jours ne sont PAS importés comme disponibilité
//   pour la grille d'ouverture (la personne resterait sinon proposable par
//   la répartition automatique alors qu'elle ne doit être sollicitée que
//   pour de l'animation) — la ligne est simplement signalée pour vérif
//   manuelle.
//
// JOURS -> disponibilités (uniquement si le niveau ci-dessus qualifie) :
//   reconnaît "ma"/"me"/"me matin"/"sa"/"ve" (accents/majuscules ignorés,
//   "+"/"," comme séparateurs, texte superflu type "soir(ées)" toléré) et
//   "tous les jours". Tout le reste (ex. "déco", "anim") n'est pas reconnu
//   et n'ajoute aucune disponibilité — signalé en avertissement.
//
// Si la colonne JOURS contient (n'importe où) "responsable", le rôle
// Responsable est proposé pour cette ligne, indépendamment du niveau.

const ALL_SLOT_KEYS = getAvailabilityOptions().map((o) => o.slotKey);

const NIVEAU_TO_POSTE: Record<string, Poste> = {
  "2": "ACCUEIL",
  "3": "RETOUR",
  "4": "SORTIE",
};

export interface ParsedVolunteerRow {
  line: number;
  raw: string[];
  name: string;
  email: string;
  phone: string;
  niveauRaw: string;
  joursRaw: string;
  poste: Poste | null;
  proposeResponsable: boolean;
  slotKeys: string[];
  warnings: string[];
}

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function cleanNamePart(s: string): string {
  return s.replace(/\*/g, "").replace(/[()]/g, "").trim().replace(/\s+/g, " ");
}

function toTitleCase(s: string): string {
  return s
    .split(/(\s|-)/)
    .map((part) => (part === " " || part === "-" ? part : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()))
    .join("");
}

function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function parseJoursTokens(joursRaw: string): { slotKeys: string[]; warnings: string[] } {
  const normalized = stripAccents(joursRaw.toLowerCase());
  if (normalized.includes("tous les jours")) {
    return { slotKeys: [...ALL_SLOT_KEYS], warnings: [] };
  }

  const tokens = normalized
    .split(/[,+]/)
    .map((t) => t.replace(/[()]/g, "").trim())
    .filter(Boolean);
  // Découpage du texte d'origine sur les mêmes points de séparation, pour
  // afficher le libellé non normalisé (accents/casse) dans les avertissements.
  const originalTokens = joursRaw
    .split(/[,+]/)
    .map((t) => t.replace(/[()]/g, "").trim())
    .filter(Boolean);

  const slotKeys = new Set<string>();
  const unrecognized: string[] = [];

  tokens.forEach((token, i) => {
    const prefix2 = token.slice(0, 2);
    if (prefix2 === "ma") {
      slotKeys.add("mardi:NYON");
    } else if (prefix2 === "me") {
      slotKeys.add(token.includes("matin") ? "mercredi-matin:NYON" : "mercredi-apres-midi:NYON");
    } else if (prefix2 === "sa") {
      slotKeys.add("samedi:NYON");
    } else if (prefix2 === "ve") {
      slotKeys.add("vendredi:NYON");
    } else {
      unrecognized.push(originalTokens[i] ?? token);
    }
  });

  const warnings = unrecognized.length > 0 ? [`jour(s) non reconnu(s) : "${unrecognized.join(", ")}"`] : [];
  return { slotKeys: [...slotKeys], warnings };
}

export function parseVolunteerImportText(text: string): ParsedVolunteerRow[] {
  const rows: ParsedVolunteerRow[] = [];

  const lines = text.split(/\r?\n/);
  lines.forEach((line, idx) => {
    if (!line.trim()) return;
    const cells = line.split("\t").map((c) => c.trim());
    while (cells.length < 7) cells.push("");

    const [prenomRaw, nomRaw, mobile, emailRaw, niveauRaw, joursRaw] = cells;
    const email = emailRaw.trim().toLowerCase();
    if (!looksLikeEmail(email)) return; // ligne d'en-tête, séparateur vide, ou ligne sans email exploitable

    const prenom = cleanNamePart(prenomRaw);
    const nom = toTitleCase(cleanNamePart(nomRaw));
    const name = `${prenom} ${nom}`.trim();
    if (!name) return;

    const warnings: string[] = [];
    const niveauKey = niveauRaw.trim();
    const poste = NIVEAU_TO_POSTE[niveauKey] ?? null;

    const proposeResponsable = stripAccents(joursRaw.toLowerCase()).includes("responsable");

    let slotKeys: string[] = [];
    if (poste) {
      const parsedJours = parseJoursTokens(joursRaw);
      slotKeys = parsedJours.slotKeys;
      warnings.push(...parsedJours.warnings);
    } else if (!proposeResponsable && niveauKey) {
      warnings.push(
        `niveau "${niveauKey}" non reconnu comme qualifiant pour les ouvertures : poste et disponibilités non importés`
      );
    } else if (!proposeResponsable && !niveauKey) {
      warnings.push("niveau non renseigné : poste et disponibilités non importés");
    }

    rows.push({
      line: idx + 1,
      raw: cells,
      name,
      email,
      phone: mobile.trim(),
      niveauRaw: niveauKey,
      joursRaw: joursRaw.trim(),
      poste,
      proposeResponsable,
      slotKeys,
      warnings,
    });
  });

  return rows;
}
