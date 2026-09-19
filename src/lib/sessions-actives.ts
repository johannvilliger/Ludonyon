import "server-only";

// Suivi léger, en mémoire, des formulaires de dépôt/modification de liste
// actuellement ouverts dans un navigateur — sert uniquement à vérifier avant
// un déploiement ou un redémarrage du site (voir /gestion/dashboard) qu'aucun
// vendeur n'est en train de taper sa liste. Pas besoin de survivre à un
// redémarrage : dès que le serveur redémarre, toute activité en cours est de
// toute façon interrompue, donc rien à charger depuis la base au démarrage.
type SessionActive = { label: string; derniereActivite: number };

const SESSIONS = new Map<string, SessionActive>();

// Au-delà, on considère l'onglet fermé (le battement côté client toutes les
// 20s a cessé) plutôt que d'afficher une session fantôme indéfiniment.
const EXPIRATION_MS = 60_000;

export function signalerActiviteEnCours(cle: string, label: string): void {
  SESSIONS.set(cle, { label, derniereActivite: Date.now() });
}

export function listerSessionsActives(): SessionActive[] {
  const maintenant = Date.now();
  const actives: SessionActive[] = [];
  for (const [cle, session] of SESSIONS) {
    if (maintenant - session.derniereActivite > EXPIRATION_MS) {
      SESSIONS.delete(cle);
    } else {
      actives.push(session);
    }
  }
  return actives.sort((a, b) => a.derniereActivite - b.derniereActivite);
}
