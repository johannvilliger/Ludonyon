import { redirect } from "next/navigation";
import { accueilEstConnecte } from "@/lib/gestion";

// Verrouille l'accès à tout /accueil (jusqu'ici jamais protégé, juste
// jamais lié publiquement) — un seul contrôle ici couvre toutes les pages
// de la section (recherche, liste sur place, fiche vendeur, étiquettes).
export default async function AccueilLayout({ children }: { children: React.ReactNode }) {
  if (!(await accueilEstConnecte())) redirect("/gestion");
  return children;
}
