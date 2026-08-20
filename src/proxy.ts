export { auth as proxy } from "@/auth";

export const config = {
  matcher: [
    // /api/calendrier/[token] est un flux d'abonnement public (lien secret
    // par bénévole, lu par des applications de calendrier externes) : pas
    // de session à vérifier, donc exclu comme /api/auth.
    "/((?!api/auth|api/calendrier|_next/static|_next/image|favicon.ico|images/|manifest.json).*)",
  ],
};
