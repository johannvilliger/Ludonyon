export { auth as proxy } from "@/auth";

// Fichiers statiques publics (logos, icônes PWA, manifest, service worker) :
// doivent rester lisibles sans session, notamment sur la page de connexion
// elle-même et par le navigateur/l'OS (installation PWA, notifications).
// Les photos de bénévoles (public/uploads/) ne sont volontairement PAS
// listées ici : elles restent derrière l'authentification.
export const config = {
  matcher: [
    // /api/calendrier/[token] est un flux d'abonnement public (lien secret
    // par bénévole, lu par des applications de calendrier externes) : pas
    // de session à vérifier, donc exclu comme /api/auth.
    "/((?!api/auth|api/calendrier|_next/static|_next/image|images/|icons/|favicon.ico|logo.png|logo-ludotheque.png|manifest.webmanifest|sw.js).*)",
  ],
};
