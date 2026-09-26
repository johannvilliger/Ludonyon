import Link from "next/link";
import { CompteARebours } from "@/components/CompteARebours";
import { queryOne } from "@/lib/db";
import { enregistrerVisite } from "@/lib/visites";

export const dynamic = "force-dynamic";

const MESSAGE_PAR_DEFAUT = "Le dépôt de listes n'est plus ouvert pour le moment.";

export default async function Home() {
  // L'écriture en base est différée après l'envoi de la réponse (voir
  // enregistrerVisite) — cet await ne fait que lire les en-têtes de la
  // requête, quasi instantané.
  await enregistrerVisite();

  const parametres = await queryOne<{
    date_ouverture_troc: string | null;
    message_depot_termine: string | null;
  }>("SELECT date_ouverture_troc, message_depot_termine FROM parametres_gestion WHERE id = 1");
  // Même règle que /vendeur/nouveau : le dépôt en ligne reste ouvert pendant
  // le dépôt ET la réception, seule la phase caisse (et au-delà) le ferme —
  // avant cette correction, cette page gardait son bouton "Déposer ma
  // liste" quelle que soit la phase, y compris en pleine caisse.
  const edition = await queryOne<{ phase: string }>("SELECT phase FROM editions WHERE active_flag = 1");
  const depotOuvert = edition?.phase === "depot" || edition?.phase === "reception";

  return (
    <main className="mx-auto w-full flex max-w-2xl flex-1 flex-col justify-center px-6 py-12">
      <h1 className="text-4xl font-semibold tracking-tight">Troc de la Ludothèque Nyon Région</h1>

      {depotOuvert ? (
        <>
          <p className="mt-3 text-zinc-600">
            Déposez votre liste de jeux et jouets avant le troc, récupérez votre numéro de vendeur, et
            revenez le jour du dépôt avec vos articles.
          </p>

          {parametres?.date_ouverture_troc && (
            <div className="mt-8">
              <p className="text-sm font-medium text-zinc-600">Début de notre troc annuel dans :</p>
              <div className="mt-4">
                <CompteARebours dateCibleIso={parametres.date_ouverture_troc.replace(" ", "T")} />
              </div>
            </div>
          )}

          <Link
            href="/vendeur/nouveau"
            className="mx-auto mt-8 flex w-fit items-center rounded-md bg-zinc-900 px-5 py-3 font-medium text-white hover:bg-zinc-800"
          >
            Déposer ma liste
          </Link>
        </>
      ) : (
        <p className="mt-3 whitespace-pre-line text-zinc-600">
          {parametres?.message_depot_termine || MESSAGE_PAR_DEFAUT}
        </p>
      )}
    </main>
  );
}
