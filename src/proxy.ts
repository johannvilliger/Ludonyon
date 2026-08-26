import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { siteTrocOuvert } from "@/lib/gestion";

// Verrouille tout le site public tant que le troc n'est pas ouvert (voir
// siteTrocOuvert). /gestion reste toujours accessible : c'est le point
// d'entrée pour le staff, déjà protégé par ses propres codes.
export default async function proxy(request: NextRequest) {
  if (await siteTrocOuvert()) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/verrouille";
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    // Exclut /gestion, /verrouille elle-même, les internes Next.js et tout
    // fichier statique (nom contenant un point, ex. favicon.ico,
    // reglement.pdf, icon.png).
    "/((?!gestion|verrouille|_next/static|_next/image|.*\\..*).*)",
  ],
};
