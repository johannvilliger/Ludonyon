import type { MetadataRoute } from "next";
import { urlAbsolue } from "@/lib/url";

export const dynamic = "force-dynamic";

// Autorise l'indexation des pages publiques (accueil, mode d'emploi, dépôt
// de liste) mais exclut tout ce qui est protégé par mot de passe/code secret
// (dashboard, accueil réception, caisses, bénévoles) ou qui n'a de sens que
// via un lien personnel reçu par email (confirmation/modification de liste,
// avec un code dans l'URL) — jamais destiné à apparaître dans une recherche
// Google. Ce fichier n'est pas une barrière de sécurité (ces pages restent
// de toute façon protégées par leurs propres codes d'accès), juste une
// indication de bonne conduite pour les robots qui la respectent.
export default async function robots(): Promise<MetadataRoute.Robots> {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/gestion",
        "/accueil",
        "/caisse",
        "/benevole",
        "/remboursements",
        "/secu",
        "/vendeur/modifier/",
        "/vendeur/confirmation/",
      ],
    },
    sitemap: await urlAbsolue("/sitemap.xml"),
  };
}
