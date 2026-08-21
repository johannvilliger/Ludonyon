// Séparé de photoStorage.ts (qui utilise fs/promises, incompatible avec un
// bundle client) pour que les composants clients comme Avatar puissent
// calculer l'URL d'une photo sans tirer le code d'accès disque dans le
// navigateur.
export function photoUrl(photoPath: string | null): string | null {
  return photoPath ? `/uploads/photos/${photoPath}` : null;
}
