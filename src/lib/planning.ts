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

export interface SlotDef {
  site: Site;
  periode: Periode;
  hours: string;
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
    slots: [{ site: "NYON", periode: "JOURNEE", hours: "16h–19h" }],
  },
  {
    key: "mercredi-matin",
    offset: 2,
    label: "Mercredi matin",
    slots: [{ site: "NYON", periode: "MATIN", hours: "10h–12h" }],
  },
  {
    key: "mercredi-apres-midi",
    offset: 2,
    label: "Mercredi après-midi",
    slots: [
      { site: "NYON", periode: "APREM", hours: "15h–18h" },
      { site: "GLAND", periode: "APREM", hours: "15h–18h" },
    ],
  },
  {
    key: "vendredi",
    offset: 4,
    label: "Vendredi",
    slots: [{ site: "NYON", periode: "JOURNEE", hours: "15h–18h" }],
  },
  {
    key: "samedi",
    offset: 5,
    label: "Samedi",
    slots: [
      { site: "NYON", periode: "JOURNEE", hours: "10h–13h" },
      { site: "GLAND", periode: "JOURNEE", hours: "10h–12h" },
    ],
  },
];

// Une "feuille" de la grille : une case affichée dans le tableau. Un
// groupe (ex. "Mercredi après-midi") produit deux feuilles côte à côte
// (Nyon, Gland) quand il a deux créneaux ; sinon une seule.
export interface LeafSlot {
  groupKey: string;
  groupLabel: string;
  offset: number;
  site: Site;
  periode: Periode;
  hours: string;
  siteLabel?: string;
}

export function getLeafSlots(): LeafSlot[] {
  const leaves: LeafSlot[] = [];
  for (const column of PLANNING_COLUMNS) {
    const double = column.slots.length > 1;
    for (const slot of column.slots) {
      leaves.push({
        groupKey: column.key,
        groupLabel: column.label,
        offset: column.offset,
        site: slot.site,
        periode: slot.periode,
        hours: slot.hours,
        siteLabel: double ? SITE_LABELS[slot.site] : undefined,
      });
    }
  }
  return leaves;
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
