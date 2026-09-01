const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailValide(valeur: string): boolean {
  return REGEX_EMAIL.test(valeur.trim());
}
