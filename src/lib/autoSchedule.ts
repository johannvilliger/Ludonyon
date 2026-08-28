import { prisma } from "@/lib/prisma";
import {
  getPlanningWeeks,
  slotKey,
  dateKey,
  buildClosureLabelByDate,
  type LeafSlot,
  type Site,
  type Periode,
} from "@/lib/planning";
import { canCoverPoste, isValidPoste, POSTE_LABELS, type Poste } from "@/lib/postes";
import { ROLE_LABELS, type Role } from "@/lib/roles";

// Composition des ouvertures par créneau, fixée avec le comité le
// 28.08.2026 (voir aussi Espace organisation > Bénévoles > Import groupé,
// qui fixe le poste de chacun·e à partir du niveau de formation) :
//   - Le poste Sortie (caisse) est réservé au/à la responsable d'ouverture
//     (rôle Responsable ou Comité) — c'est toujours iel qui l'occupe. À
//     défaut de responsable/comité disponible, un·e bénévole de niveau
//     Sortie peut le couvrir en repli (créneau signalé "sans responsable"
//     mais pas vide), SAUF à Gland où la place unique reste strictement
//     réservée au/à la responsable (aucun repli bénévole).
//   - Le poste Retour et le poste Accueil demandent respectivement un
//     niveau Retour et un niveau Accueil (un niveau supérieur peut couvrir
//     un niveau inférieur, voir canCoverPoste).
//   - Le samedi ajoute une place "Anim./accueil" ouverte à tou·te·s, sans
//     condition de poste (y compris les bénévoles non formé·e·s aux
//     ouvertures, niveau 0/1).
type SeatKind = "responsable" | "poste" | "open";

interface SeatSpec {
  kind: SeatKind;
  posteRequired?: Poste; // uniquement pour kind "poste"
  allowBenevoleFallback?: boolean; // uniquement pour kind "responsable"
  label: string;
}

const RESPONSABLE_SEAT: SeatSpec = {
  kind: "responsable",
  allowBenevoleFallback: true,
  label: "Responsable (poste Sortie)",
};
const RESPONSABLE_ONLY_SEAT: SeatSpec = {
  kind: "responsable",
  allowBenevoleFallback: false,
  label: "Responsable",
};
const RETOUR_SEAT: SeatSpec = { kind: "poste", posteRequired: "RETOUR", label: "Poste retour" };
const ACCUEIL_SEAT: SeatSpec = { kind: "poste", posteRequired: "ACCUEIL", label: "Poste accueil" };
const ANIM_SEAT: SeatSpec = { kind: "open", label: "Anim./accueil" };

export const SEAT_REQUIREMENTS: Record<string, SeatSpec[]> = {
  "mardi:NYON": [RESPONSABLE_SEAT, RETOUR_SEAT, ACCUEIL_SEAT],
  "mercredi-matin:NYON": [RESPONSABLE_SEAT, RETOUR_SEAT, ACCUEIL_SEAT],
  "mercredi-apres-midi:NYON": [RESPONSABLE_SEAT, RETOUR_SEAT, ACCUEIL_SEAT],
  "mercredi-apres-midi:GLAND": [RESPONSABLE_ONLY_SEAT],
  "vendredi:NYON": [RESPONSABLE_SEAT, ACCUEIL_SEAT],
  "samedi:NYON": [RESPONSABLE_SEAT, RETOUR_SEAT, ACCUEIL_SEAT, ANIM_SEAT],
  "samedi:GLAND": [RESPONSABLE_ONLY_SEAT],
};

export interface AutoScheduleCandidate {
  id: string;
  name: string;
  role: string;
  poste: string | null;
  availabilitySlotKeys: Set<string>;
  vacationDateKeys: Set<string>;
}

export interface ProposedAssignee {
  userId: string;
  name: string;
  role: string;
  poste: string | null;
  isResponsableSeat: boolean;
  seatLabel: string;
}

export interface ProposedShift {
  date: Date;
  dateKeyStr: string;
  site: Site;
  periode: Periode;
  groupLabel: string;
  slotKey: string;
  required: number;
  assignees: ProposedAssignee[];
  missingResponsable: boolean;
  understaffed: boolean;
  manuallyOverridden: boolean;
}

export interface AutoScheduleResult {
  shifts: ProposedShift[];
  assignmentCountByUser: Map<string, number>;
}

function expandDateRangeKeys(start: Date, end: Date): Set<string> {
  const keys = new Set<string>();
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    keys.add(dateKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}

function posteCanCover(poste: string | null, required: Poste): boolean {
  return !!poste && isValidPoste(poste) && canCoverPoste(poste, required);
}

function byEquity(countByUser: Map<string, number>) {
  return (a: AutoScheduleCandidate, b: AutoScheduleCandidate) =>
    countByUser.get(a.id)! - countByUser.get(b.id)! || a.name.localeCompare(b.name);
}

// Choisit qui occupe un siège donné parmi le vivier encore disponible pour
// ce créneau, en priorisant toujours l'équité (le moins de créneaux déjà
// proposés ce mois-ci), puis — pour un siège de poste — un niveau exact
// plutôt que supérieur, pour ne pas "gaspiller" une personne de niveau
// Sortie sur un siège Accueil alors qu'elle pourrait être nécessaire
// ailleurs (les sièges sont remplis dans l'ordre Responsable > Retour >
// Accueil > Anim., du plus contraint au moins contraint).
function pickForSeat(
  seat: SeatSpec,
  pool: AutoScheduleCandidate[],
  countByUser: Map<string, number>
): AutoScheduleCandidate | null {
  const equitySort = byEquity(countByUser);

  if (seat.kind === "responsable") {
    const responsables = pool
      .filter((c) => c.role === "RESPONSABLE" || c.role === "COMITE")
      .sort(equitySort);
    if (responsables.length > 0) return responsables[0];
    if (seat.allowBenevoleFallback) {
      const fallback = pool.filter((c) => c.poste === "SORTIE").sort(equitySort);
      if (fallback.length > 0) return fallback[0];
    }
    return null;
  }

  if (seat.kind === "poste") {
    const required = seat.posteRequired!;
    const qualified = pool
      .filter((c) => posteCanCover(c.poste, required))
      .sort(
        (a, b) =>
          countByUser.get(a.id)! - countByUser.get(b.id)! ||
          (a.poste === required ? 0 : 1) - (b.poste === required ? 0 : 1) ||
          a.name.localeCompare(b.name)
      );
    return qualified[0] ?? null;
  }

  // "open" (Anim./accueil) : n'importe qui de disponible, sans condition
  // de poste ni de rôle — y compris les bénévoles non formé·e·s aux
  // ouvertures (niveau 0/1, poste non défini).
  const anyone = [...pool].sort(equitySort);
  return anyone[0] ?? null;
}

// Algorithme glouton avec équité : parcourt les créneaux du mois dans
// l'ordre chronologique, et pour chacun remplit ses sièges (voir
// SEAT_REQUIREMENTS) un par un, du plus contraint au moins contraint, en
// choisissant à chaque fois — parmi les personnes encore éligibles pour ce
// créneau — celle ayant le moins de créneaux déjà proposés ce mois-ci. Une
// même personne n'est jamais proposée deux fois sur des créneaux qui se
// chevauchent réellement dans le temps (même date et même période, ex.
// Nyon/Gland le même après-midi) — elle peut en revanche très bien faire
// deux créneaux différents le même jour (ex. Nyon le matin, Gland
// l'après-midi).
export function generateAutoSchedule(
  year: number,
  month: number,
  candidates: AutoScheduleCandidate[],
  closedDateKeys: Set<string>
): AutoScheduleResult {
  const weeks = getPlanningWeeks(year, month);
  const targets: { date: Date; leaf: LeafSlot }[] = [];
  for (const week of weeks) {
    for (const cell of week.cells) {
      if (!cell.inMonth) continue;
      targets.push({ date: cell.date, leaf: cell.leaf });
    }
  }
  targets.sort((a, b) => a.date.getTime() - b.date.getTime());

  const countByUser = new Map<string, number>();
  for (const c of candidates) countByUser.set(c.id, 0);

  // Empêche seulement les créneaux qui se chevauchent réellement dans le
  // temps (même date ET même période, ex. Nyon/Gland l'après-midi du même
  // mercredi) : une même personne peut très bien faire Nyon le matin puis
  // Gland l'après-midi, ce ne sont pas les mêmes horaires.
  const assignedOnDatePeriode = new Map<string, Set<string>>();

  const shifts: ProposedShift[] = [];

  for (const { date, leaf } of targets) {
    const dKey = dateKey(date);
    if (closedDateKeys.has(dKey)) continue;

    const key = slotKey(leaf.groupKey, leaf.site);
    const seatDefs = SEAT_REQUIREMENTS[key] ?? [RESPONSABLE_ONLY_SEAT];
    const overlapKey = `${dKey}|${leaf.periode}`;
    const alreadyThisPeriode = assignedOnDatePeriode.get(overlapKey) ?? new Set<string>();

    const eligibleBase = candidates.filter(
      (c) =>
        c.availabilitySlotKeys.has(key) &&
        !c.vacationDateKeys.has(dKey) &&
        !alreadyThisPeriode.has(c.id)
    );

    const selected: ProposedAssignee[] = [];
    const usedIds = new Set<string>();

    for (const seat of seatDefs) {
      const pool = eligibleBase.filter((c) => !usedIds.has(c.id));
      const chosen = pickForSeat(seat, pool, countByUser);
      if (!chosen) continue;
      selected.push({
        userId: chosen.id,
        name: chosen.name,
        role: chosen.role,
        poste: chosen.poste,
        isResponsableSeat:
          seat.kind === "responsable" && (chosen.role === "RESPONSABLE" || chosen.role === "COMITE"),
        seatLabel: seat.label,
      });
      usedIds.add(chosen.id);
    }

    for (const id of usedIds) {
      countByUser.set(id, (countByUser.get(id) ?? 0) + 1);
    }
    assignedOnDatePeriode.set(overlapKey, new Set([...alreadyThisPeriode, ...usedIds]));

    shifts.push({
      date,
      dateKeyStr: dKey,
      site: leaf.site,
      periode: leaf.periode,
      groupLabel: leaf.groupLabel,
      slotKey: key,
      required: seatDefs.length,
      assignees: selected,
      missingResponsable: !selected.some((a) => a.isResponsableSeat),
      understaffed: selected.length < seatDefs.length,
      manuallyOverridden: false,
    });
  }

  return { shifts, assignmentCountByUser: countByUser };
}

function seatLabelFor(role: string, poste: string | null): string {
  if (poste && isValidPoste(poste)) return POSTE_LABELS[poste];
  if (role !== "BENEVOLE") return ROLE_LABELS[role as Role] ?? role;
  return "Bénévole";
}

// Remplace, dans la proposition calculée, les créneaux pour lesquels
// un·e responsable/comité a corrigé manuellement la composition (voir
// Espace organisation > Planning > auto, boutons +/× sous chaque
// créneau) — pour ne pas avoir à relancer tout l'algorithme quand
// seul·e·s un ou deux créneaux se sont avérés faux à la relecture.
// L'équité affichée (recap par personne) est recalculée à partir du
// résultat final, overrides compris.
function applyOverrides(
  result: AutoScheduleResult,
  overrides: { date: Date; site: string; periode: string; userIds: string }[],
  usersById: Map<string, { id: string; name: string; role: string; poste: string | null }>
): AutoScheduleResult {
  if (overrides.length === 0) return result;

  const overrideByKey = new Map(
    overrides.map((o) => [`${dateKey(o.date)}|${o.site}|${o.periode}`, o])
  );

  const shifts = result.shifts.map((shift) => {
    const override = overrideByKey.get(`${shift.dateKeyStr}|${shift.site}|${shift.periode}`);
    if (!override) return shift;

    const assignees: ProposedAssignee[] = override.userIds
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .map((id) => usersById.get(id))
      .filter((u): u is NonNullable<typeof u> => !!u)
      .map((u) => ({
        userId: u.id,
        name: u.name,
        role: u.role,
        poste: u.poste,
        isResponsableSeat: u.role === "RESPONSABLE" || u.role === "COMITE",
        seatLabel: seatLabelFor(u.role, u.poste),
      }));

    return {
      ...shift,
      assignees,
      missingResponsable: !assignees.some((a) => a.isResponsableSeat),
      understaffed: assignees.length < shift.required,
      manuallyOverridden: true,
    };
  });

  const assignmentCountByUser = new Map<string, number>();
  for (const id of result.assignmentCountByUser.keys()) assignmentCountByUser.set(id, 0);
  for (const shift of shifts) {
    for (const a of shift.assignees) {
      assignmentCountByUser.set(a.userId, (assignmentCountByUser.get(a.userId) ?? 0) + 1);
    }
  }

  return { shifts, assignmentCountByUser };
}

// Charge les données nécessaires (bénévoles actif·ve·s, dispos, vacances,
// fermetures) et calcule la proposition pour le mois demandé, puis
// applique les éventuelles corrections manuelles (voir applyOverrides) —
// utilisé à la fois par la page de consultation et par l'action
// d'application.
export async function computeAutoScheduleForMonth(
  year: number,
  month: number
): Promise<AutoScheduleResult> {
  const weeks = getPlanningWeeks(year, month);
  const rangeStart = weeks[0].monday;
  const rangeEnd = new Date(weeks[weeks.length - 1].monday);
  rangeEnd.setDate(rangeEnd.getDate() + 7);

  const [users, closures, overrides] = await Promise.all([
    prisma.user.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        role: true,
        poste: true,
        availabilities: { select: { slotKey: true } },
        vacations: { select: { startDate: true, endDate: true } },
      },
    }),
    prisma.planningClosure.findMany({
      where: { startDate: { lt: rangeEnd }, endDate: { gte: rangeStart } },
    }),
    prisma.autoScheduleOverride.findMany({
      where: { date: { gte: rangeStart, lt: rangeEnd } },
    }),
  ]);

  const candidates: AutoScheduleCandidate[] = users.map((u) => {
    const vacationDateKeys = new Set<string>();
    for (const v of u.vacations) {
      for (const k of expandDateRangeKeys(v.startDate, v.endDate)) vacationDateKeys.add(k);
    }
    return {
      id: u.id,
      name: u.name,
      role: u.role,
      poste: u.poste,
      availabilitySlotKeys: new Set(u.availabilities.map((a) => a.slotKey)),
      vacationDateKeys,
    };
  });

  const closedDateKeys = new Set(buildClosureLabelByDate(closures).keys());

  const result = generateAutoSchedule(year, month, candidates, closedDateKeys);
  const usersById = new Map(users.map((u) => [u.id, u]));
  return applyOverrides(result, overrides, usersById);
}
