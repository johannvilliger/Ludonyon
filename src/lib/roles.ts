export const ROLES = ["BENEVOLE", "RESPONSABLE", "COMITE"] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  BENEVOLE: "Bénévole",
  RESPONSABLE: "Responsable",
  COMITE: "Comité",
};

// Rôles ayant accès à l'espace privé "Organisation" (gestion des
// événements, annonces et de l'annuaire).
export const ORGANISATION_ROLES: Role[] = ["RESPONSABLE", "COMITE"];

export function isOrganisationRole(role: string): boolean {
  return ORGANISATION_ROLES.includes(role as Role);
}

export function isValidRole(role: string): role is Role {
  return (ROLES as readonly string[]).includes(role);
}

// Une séance comité (audience "COMITE") n'est accessible qu'aux membres
// du comité — ni les responsables, ni les bénévoles.
export function canAccessEventAudience(audience: string, role: string): boolean {
  return audience !== "COMITE" || role === "COMITE";
}
