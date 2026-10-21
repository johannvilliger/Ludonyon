import "server-only";

// Limite dédiée à l'assistant troc (API publique, appelle un modèle payant)
// — volontairement séparée du anti-brute-force de rate-limit.ts, dont la
// sémantique (compter des échecs de connexion, escalader un blocage) ne
// correspond pas à un simple quota d'usage normal.
const FENETRE_MS = 60 * 60_000; // 1 heure
const MAX_MESSAGES = 20; // par IP — large marge pour un usage normal, bloque un abus de coût

const compteurs = new Map<string, number[]>();

// Purge périodique des IP inactives, pour ne pas accumuler indéfiniment en
// mémoire pendant un événement de plusieurs jours.
setInterval(
  () => {
    const maintenant = Date.now();
    for (const [ip, horodatages] of compteurs) {
      const restants = horodatages.filter((t) => maintenant - t < FENETRE_MS);
      if (restants.length === 0) compteurs.delete(ip);
      else compteurs.set(ip, restants);
    }
  },
  10 * 60_000,
).unref();

export function limiteMessagesDepassee(ip: string): boolean {
  const maintenant = Date.now();
  const horodatages = (compteurs.get(ip) ?? []).filter((t) => maintenant - t < FENETRE_MS);
  if (horodatages.length >= MAX_MESSAGES) {
    compteurs.set(ip, horodatages);
    return true;
  }
  horodatages.push(maintenant);
  compteurs.set(ip, horodatages);
  return false;
}
