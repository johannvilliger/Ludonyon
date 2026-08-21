// Grille hebdomadaire fixe des ouvertures de la ludothèque, utilisée par
// la page /planning. Nyon est ouvert quatre créneaux ; Gland ouvre en plus
// le mercredi après-midi et le samedi matin (mêmes dates, deux colonnes
// côte à côte).
const TIMEZONE = "Europe/Zurich";

export type Site = "NYON" | "GLAND";
export type Periode = "JOURNEE" | "MATIN" | "APREM";

export const SITE_LABELS: Record<Site, string> = {
  NYON: "Nyon",
  GLAND: "Gland",
};

// start/end au format "HH:mm" — source unique de vérité pour l'affichage
// ET pour construire les horaires exacts des événements .ics exportés.
export interface SlotDef {
  site: Site;
  periode: Periode;
  start: string;
  end: string;
}

export interface ColumnDef {
  key: string;
  // Décalage en jours depuis le lundi de la semaine (lundi = 0).
  offset: number;
  label: string;
  slots: SlotDef[];
}

export const PLANNING_COLUMNS: ColumnDef[] = [
  {
    key: "mardi",
    offset: 1,
    label: "Mardi",
    slots: [{ site: "NYON", periode: "JOURNEE", start: "16:00", end: "19:00" }],
  },
  {
    key: "mercredi-matin",
    offset: 2,
    label: "Mercredi matin",
    slots: [{ site: "NYON", periode: "MATIN", start: "10:00", end: "12:00" }],
  },
  {
    key: "mercredi-apres-midi",
    offset: 2,
    label: "Mercredi après-midi",
    slots: [
      { site: "NYON", periode: "APREM", start: "15:00", end: "18:00" },
      { site: "GLAND", periode: "APREM", start: "15:00", end: "18:00" },
    ],
  },
  {
    key: "vendredi",
    offset: 4,
    label: "Vendredi",
    slots: [{ site: "NYON", periode: "JOURNEE", start: "15:00", end: "18:00" }],
  },
  {
    key: "samedi",
    offset: 5,
    label: "Samedi",
    slots: [
      { site: "NYON", periode: "JOURNEE", start: "10:00", end: "13:00" },
      { site: "GLAND", periode: "JOURNEE", start: "10:00", end: "12:00" },
    ],
  },
];

function formatHourLabel(hm: string): string {
  const [h, m] = hm.split(":");
  return m === "00" ? `${Number(h)}h` : `${Number(h)}h${m}`;
}

export function formatHoursRange(start: string, end: string): string {
  return `${formatHourLabel(start)}–${formatHourLabel(end)}`;
}

export function findSlotDef(site: Site, periode: Periode): SlotDef | undefined {
  for (const column of PLANNING_COLUMNS) {
    const slot = column.slots.find((s) => s.site === site && s.periode === periode);
    if (slot) return slot;
  }
  return undefined;
}

function findColumnKeyFor(site: Site, periode: Periode): string | undefined {
  for (const column of PLANNING_COLUMNS) {
    if (column.slots.some((s) => s.site === site && s.periode === periode)) {
      return column.key;
    }
  }
  return undefined;
}

// Clé stable identifiant un créneau de la grille (groupe de jour + site),
// utilisée pour stocker les disponibilités des bénévoles et cibler les
// notifications de recherche de remplaçant.
export function slotKey(groupKey: string, site: Site): string {
  return `${groupKey}:${site}`;
}

export function shiftSlotKey(site: Site, periode: Periode): string | null {
  const groupKey = findColumnKeyFor(site, periode);
  return groupKey ? slotKey(groupKey, site) : null;
}

export interface AvailabilityOption {
  slotKey: string;
  label: string;
  hours: string;
}

// Les 7 créneaux de la grille sous forme de cases à cocher, avec un
// libellé distinguant Nyon/Gland pour les créneaux à double colonne
// (une liste à plat n'a pas le contexte visuel du tableau).
export function getAvailabilityOptions(): AvailabilityOption[] {
  const options: AvailabilityOption[] = [];
  for (const column of PLANNING_COLUMNS) {
    const double = column.slots.length > 1;
    for (const slot of column.slots) {
      options.push({
        slotKey: slotKey(column.key, slot.site),
        label: double ? `${column.label} (${SITE_LABELS[slot.site]})` : column.label,
        hours: formatHoursRange(slot.start, slot.end),
      });
    }
  }
  return options;
}

// Date/heure exactes (fuseau Europe/Zurich, via le constructeur local — le
// serveur tourne avec TZ=Europe/Zurich, comme pour la saisie des
// événements) de début et fin d'un créneau à une date donnée.
export function getShiftDateTimeRange(
  date: Date,
  site: Site,
  periode: Periode
): { start: Date; end: Date } | null {
  const slot = findSlotDef(site, periode);
  if (!slot) return null;
  const [startH, startM] = slot.start.split(":").map(Number);
  const [endH, endM] = slot.end.split(":").map(Number);
  return {
    start: new Date(date.getFullYear(), date.getMonth(), date.getDate(), startH, startM),
    end: new Date(date.getFullYear(), date.getMonth(), date.getDate(), endH, endM),
  };
}

// Une "feuille" de la grille : une case affichée dans le tableau.
export interface LeafSlot {
  groupKey: string;
  groupLabel: string;
  offset: number;
  site: Site;
  periode: Periode;
  hours: string;
}

// Regroupées par site (tout Nyon, puis tout Gland) plutôt que par jour,
// pour que le tableau affiche un grand bloc Nyon à gauche et un bloc
// Gland à droite (plus lisible qu'un entrelacement colonne par colonne).
export function getLeafSlots(): LeafSlot[] {
  const bySite: Record<Site, LeafSlot[]> = { NYON: [], GLAND: [] };
  for (const column of PLANNING_COLUMNS) {
    for (const slot of column.slots) {
      bySite[slot.site].push({
        groupKey: column.key,
        groupLabel: column.label,
        offset: column.offset,
        site: slot.site,
        periode: slot.periode,
        hours: formatHoursRange(slot.start, slot.end),
      });
    }
  }
  return [...bySite.NYON, ...bySite.GLAND];
}

export interface PlanningWeek {
  monday: Date;
  cells: { leaf: LeafSlot; date: Date; inMonth: boolean }[];
}

// Lundi (00:00, fuseau Europe/Zurich) de la semaine contenant `date`.
function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Construit les semaines (lundi à dimanche) couvrant le mois demandé, avec
// pour chaque semaine la date exacte de chaque colonne d'ouverture. Les
// semaines à cheval sur le mois précédent/suivant sont incluses en entier
// pour rester lisibles, avec `inMonth: false` sur les jours hors mois.
export function getPlanningWeeks(year: number, month: number): PlanningWeek[] {
  const firstOfMonth = new Date(year, month - 1, 1);
  const lastOfMonth = new Date(year, month, 0);

  const start = mondayOf(firstOfMonth);
  const end = mondayOf(lastOfMonth);

  const leaves = getLeafSlots();
  const weeks: PlanningWeek[] = [];
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    const monday = new Date(cursor);
    const cells = leaves.map((leaf) => {
      const date = new Date(monday);
      date.setDate(date.getDate() + leaf.offset);
      return {
        leaf,
        date,
        inMonth: date.getMonth() === month - 1 && date.getFullYear() === year,
      };
    });
    weeks.push({ monday, cells });
    cursor.setDate(cursor.getDate() + 7);
  }

  return weeks;
}

// Semaines (lundi à dimanche) couvrant une plage de dates arbitraire (pas
// calée sur un mois), utilisée pour générer le modèle Excel d'import. Les
// cellules hors de [rangeStart, rangeEnd] restent dans le tableau (semaine
// entière) mais marquées `inMonth: false`, comme pour getPlanningWeeks.
export function getPlanningWeeksBetween(rangeStart: Date, rangeEnd: Date): PlanningWeek[] {
  const start = mondayOf(rangeStart);
  const end = mondayOf(rangeEnd);

  const leaves = getLeafSlots();
  const weeks: PlanningWeek[] = [];
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    const monday = new Date(cursor);
    const cells = leaves.map((leaf) => {
      const date = new Date(monday);
      date.setDate(date.getDate() + leaf.offset);
      return {
        leaf,
        date,
        inMonth: date.getTime() >= rangeStart.getTime() && date.getTime() <= rangeEnd.getTime(),
      };
    });
    weeks.push({ monday, cells });
    cursor.setDate(cursor.getDate() + 7);
  }

  return weeks;
}

// Clé "YYYY-MM-DD" -> Date (minuit UTC), format utilisé pour stocker les
// dates de créneau/fermeture (colonnes DATE) indépendamment du fuseau.
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function dateKey(date: Date): string {
  // Clé locale (fuseau Suisse) indépendante de l'heure de stockage,
  // utilisée pour indexer les créneaux chargés depuis la base.
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function shiftKey(date: Date, site: Site, periode: Periode): string {
  return `${dateKey(date)}|${site}|${periode}`;
}

// Construit une table jour -> libellé(s) de fermeture, pour marquer les
// jours fermés (vacances globales) sur la grille sans avoir à comparer des
// plages de dates cellule par cellule. Avance en UTC (les dates de
// fermeture sont stockées en DATE, minuit UTC, comme les créneaux — voir
// dateKey) pour rester indépendant du fuseau du serveur.
export function buildClosureLabelByDate(
  closures: { startDate: Date; endDate: Date; label: string }[]
): Map<string, string> {
  const map = new Map<string, string>();
  for (const closure of closures) {
    const cursor = new Date(closure.startDate);
    while (cursor.getTime() <= closure.endDate.getTime()) {
      const key = dateKey(cursor);
      const existing = map.get(key);
      map.set(key, existing ? `${existing}, ${closure.label}` : closure.label);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }
  return map;
}

const dayLabelFormatter = new Intl.DateTimeFormat("fr-CH", {
  timeZone: TIMEZONE,
  day: "numeric",
  month: "short",
});

export function formatDayLabel(date: Date): string {
  return dayLabelFormatter.format(date);
}

const monthLabelFormatter = new Intl.DateTimeFormat("fr-CH", {
  timeZone: TIMEZONE,
  month: "long",
  year: "numeric",
});

export function formatMonthLabel(year: number, month: number): string {
  const label = monthLabelFormatter.format(new Date(year, month - 1, 15));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function addMonths(
  year: number,
  month: number,
  delta: number
): { year: number; month: number } {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}
