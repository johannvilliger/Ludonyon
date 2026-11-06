import { NextRequest, NextResponse } from "next/server";
import { resoudreCode } from "../../actions";
import { ipAppelante } from "@/lib/rate-limit";

// Lien/QR magique : équivalent de /gestion avec le code déjà tapé. Permet
// d'imprimer un QR par poste (accueil, caisse) à scanner ou mettre en
// raccourci — plus besoin de retaper le code à chaque nouvel appareil ou
// après un navigateur vidé. Révoquer un QR volé = changer le code du poste
// concerné dans le dashboard (voir resoudreCode : la même vérification que
// la saisie manuelle s'applique, donc le même blocage anti-brute-force).
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const ip = await ipAppelante();
  const resultat = await resoudreCode(decodeURIComponent(code).trim(), ip);

  if ("error" in resultat) {
    return NextResponse.redirect(new URL(`/gestion?erreur=${encodeURIComponent(resultat.error)}`, request.url));
  }

  return NextResponse.redirect(new URL(resultat.destination, request.url));
}
