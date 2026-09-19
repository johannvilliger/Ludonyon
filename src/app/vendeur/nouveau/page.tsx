import { queryOne } from "@/lib/db";
import { NouvelleListeForm } from "./nouvelle-liste-form";

export const dynamic = "force-dynamic";

const MESSAGE_PAR_DEFAUT = "Le dépôt de listes n'est plus ouvert pour le moment.";

export default async function NouvelleListePage() {
  // Le formulaire lui-même refuse déjà toute soumission hors phase "depot"
  // (voir actions.ts) — mais avant cette correction, la page continuait à
  // l'afficher normalement même en pleine caisse, laissant croire à tort
  // qu'un dépôt était encore possible.
  const edition = await queryOne<{ phase: string }>("SELECT phase FROM editions WHERE active_flag = 1");
  if (edition?.phase === "depot") return <NouvelleListeForm />;

  const parametres = await queryOne<{ message_depot_termine: string | null }>(
    "SELECT message_depot_termine FROM parametres_gestion WHERE id = 1",
  );

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Troc de la Ludothèque Nyon Région</h1>
      <p className="mt-6 whitespace-pre-line text-zinc-600">
        {parametres?.message_depot_termine || MESSAGE_PAR_DEFAUT}
      </p>
    </main>
  );
}
