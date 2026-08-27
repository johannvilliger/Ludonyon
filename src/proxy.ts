import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { siteTrocOuvert } from "@/lib/gestion";

// Verrouille tout le site public tant que le troc n'est pas ouvert (voir
// siteTrocOuvert). /gestion et /caisse restent toujours accessibles : ce
// sont les points d'entrée du staff, déjà protégés par leurs propres codes
// (accès caisse + validation depuis le dashboard) — un verrouillage forcé du
// site public ne doit jamais empêcher les caissières de travailler.
export default async function proxy(request: NextRequest) {
  if (await siteTrocOuvert()) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/verrouille";
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    // Exclut /gestion, /caisse, /verrouille elle-même, les internes Next.js
    // et tout fichier statique (nom contenant un point, ex. favicon.ico,
    // reglement.pdf, icon.png).
    "/((?!gestion|caisse|verrouille|_next/static|_next/image|.*\\..*).*)",
  ],
};
