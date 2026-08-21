// Nom d'affichage utilisé dans le modèle Excel du planning : le prénom
// seul, sauf en cas de doublon parmi les bénévoles actifs, où l'initiale
// du nom de famille est ajoutée pour lever l'ambiguïté (ex. "Marie D.").
// Le même nom sert à la fois à remplir le fichier et à le relire à
// l'import.
export type VolunteerNameEntry = { id: string; name: string; displayName: string };

function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName.trim();
}

function lastInitialOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1].charAt(0).toUpperCase() : "";
}

export function computeVolunteerDisplayNames(
  users: { id: string; name: string }[]
): VolunteerNameEntry[] {
  const firstNameCounts = new Map<string, number>();
  for (const u of users) {
    const first = firstNameOf(u.name);
    firstNameCounts.set(first, (firstNameCounts.get(first) ?? 0) + 1);
  }

  const used = new Set<string>();
  const result: VolunteerNameEntry[] = [];
  for (const u of users) {
    const first = firstNameOf(u.name);
    const duplicated = (firstNameCounts.get(first) ?? 0) > 1;
    const initial = lastInitialOf(u.name);
    const displayName = duplicated && initial ? `${first} ${initial}.` : first;

    // Filet de sécurité si l'initiale ne suffit pas non plus à distinguer
    // (ex. deux "Marie D.") : on numérote.
    let candidate = displayName;
    let n = 2;
    while (used.has(candidate.toLowerCase())) {
      candidate = `${displayName} (${n})`;
      n++;
    }
    used.add(candidate.toLowerCase());
    result.push({ id: u.id, name: u.name, displayName: candidate });
  }

  return result.sort((a, b) => a.displayName.localeCompare(b.displayName, "fr-CH"));
}

// Table de correspondance nom saisi -> id bénévole, tolérante : accepte le
// nom d'affichage exact, le nom complet, ou le prénom seul s'il est encore
// unique (le cas le plus courant si personne n'a eu besoin de désambiguïser
// au moment du remplissage).
export function buildVolunteerNameLookup(
  entries: VolunteerNameEntry[]
): Map<string, string> {
  const lookup = new Map<string, string>();
  const firstNameCounts = new Map<string, number>();
  for (const e of entries) {
    const first = firstNameOf(e.name).toLowerCase();
    firstNameCounts.set(first, (firstNameCounts.get(first) ?? 0) + 1);
  }

  for (const e of entries) {
    lookup.set(e.displayName.trim().toLowerCase(), e.id);
    lookup.set(e.name.trim().toLowerCase(), e.id);
    const first = firstNameOf(e.name).toLowerCase();
    if ((firstNameCounts.get(first) ?? 0) === 1) {
      lookup.set(first, e.id);
    }
  }

  return lookup;
}
