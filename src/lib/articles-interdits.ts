// Objets non admis au troc (règlement de la ludothèque) : bloqué à la
// saisie ET à la soumission, côté public comme côté accueil.
export const MOTS_CLES_INTERDITS = ["peluche", "dvd", "cd", "vhs"];

const REGEX_INTERDIT = new RegExp(`\\b(${MOTS_CLES_INTERDITS.join("|")})\\b`, "i");

export function motInterdit(nomArticle: string): string | null {
  const match = nomArticle.match(REGEX_INTERDIT);
  return match ? match[1] : null;
}

export function messageMotInterdit(mot: string): string {
  return `« ${mot} » ne peut pas être déposé au troc (voir le règlement).`;
}
