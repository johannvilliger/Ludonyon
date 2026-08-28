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
import { POSTES, isValidPoste } from "@/lib/postes";

// Nombre de bénévoles requis par créneau, clé = slotKey(groupKey, site)
// (même convention que les disponibilités bénévoles). Fixé avec le comité
// le 26.08.2026 — à ajuster ici si la grille de couverture change.
// Chaque créneau doit compter au moins un·e responsable/comité parmi ce
// total (pas en plus) : voir REQUIRES_RESPONSABLE dans generateAutoSchedule.
export const REQUIRED_STAFF: Record<string, number> = {
  "mardi:NYON": 3,
  "mercredi-matin:NYON": 3,
  "mercredi-apres-midi:NYON": 3,
  "mercredi-apres-midi:GLAND": 1,
  "vendredi:NYON": 2,
  "samedi:NYON": 4,
  "samedi:GLAND": 1,
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

// Algorithme glouton avec équité : parcourt les créneaux du mois dans
// l'ordre chronologique, et pour chacun choisit d'abord un·e
// responsable/comité obligatoire (parmi celleux ayant le moins de
// créneaux ce mois-ci), puis complète avec les bénévoles disponibles,
// toujours en priorisant celleux ayant le moins de créneaux déjà proposés
// ce mois-ci — pour éviter de solliciter deux fois la même personne
// pendant qu'une autre disponible n'a encore rien. En seconde priorité
// (à équité égale), un poste plus élevé (hiérarchie Accueil < Retour <
// Sortie) est préféré, pour qu'une personne capable de fermer soit
// présente autant que possible. Une même personne n'est jamais proposée
// deux fois sur des créneaux qui se chevauchent réellement dans le temps
// (même date et même période, ex. Nyon/Gland le même après-midi) — elle
// peut en revanche très bien faire deux créneaux différents le même jour
// (ex. Nyon le matin, Gland l'après-midi).
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
  const posteLevel = (p: string | null) => (p && isValidPoste(p) ? POSTES.indexOf(p) : -1);

  const shifts: ProposedShift[] = [];

  for (const { date, leaf } of targets) {
    const dKey = dateKey(date);
    if (closedDateKeys.has(dKey)) continue;

    const key = slotKey(leaf.groupKey, leaf.site);
    const required = REQUIRED_STAFF[key] ?? 1;
    const overlapKey = `${dKey}|${leaf.periode}`;
    const alreadyThisPeriode = assignedOnDatePeriode.get(overlapKey) ?? new Set<string>();

    const eligible = candidates.filter(
      (c) =>
        c.availabilitySlotKeys.has(key) &&
        !c.vacationDateKeys.has(dKey) &&
        !alreadyThisPeriode.has(c.id)
    );

    const selected: ProposedAssignee[] = [];
    const usedIds = new Set<string>();

    const responsables = eligible
      .filter((c) => c.role === "RESPONSABLE" || c.role === "COMITE")
      .sort(
        (a, b) =>
          countByUser.get(a.id)! - countByUser.get(b.id)! || a.name.localeCompare(b.name)
      );
    if (responsables.length > 0) {
      const chosen = responsables[0];
      selected.push({
        userId: chosen.id,
        name: chosen.name,
        role: chosen.role,
        poste: chosen.poste,
        isResponsableSeat: true,
      });
      usedIds.add(chosen.id);
    }

    const rest = eligible
      .filter((c) => !usedIds.has(c.id))
      .sort(
        (a, b) =>
          countByUser.get(a.id)! - countByUser.get(b.id)! ||
          posteLevel(b.poste) - posteLevel(a.poste) ||
          a.name.localeCompare(b.name)
      );
    for (const c of rest) {
      if (selected.length >= required) break;
      selected.push({
        userId: c.id,
        name: c.name,
        role: c.role,
        poste: c.poste,
        isResponsableSeat: false,
      });
      usedIds.add(c.id);
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
      required,
      assignees: selected,
      missingResponsable: !selected.some((a) => a.isResponsableSeat),
      understaffed: selected.length < required,
    });
  }

  return { shifts, assignmentCountByUser: countByUser };
}

// Charge les données nécessaires (bénévoles actif·ve·s, dispos, vacances,
// fermetures) et calcule la proposition pour le mois demandé — utilisé à
// la fois par la page de consultation et par l'action d'application.
export async function computeAutoScheduleForMonth(
  year: number,
  month: number
): Promise<AutoScheduleResult> {
  const weeks = getPlanningWeeks(year, month);
  const rangeStart = weeks[0].monday;
  const rangeEnd = new Date(weeks[weeks.length - 1].monday);
  rangeEnd.setDate(rangeEnd.getDate() + 7);

  const [users, closures] = await Promise.all([
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

  return generateAutoSchedule(year, month, candidates, closedDateKeys);
}
