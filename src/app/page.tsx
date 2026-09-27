import Link from "next/link";
import Image from "next/image";
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

      <Link href="/comment-ca-marche" className="mt-2 w-fit text-sm text-zinc-500 hover:underline">
        Comment fonctionne le troc ? →
      </Link>

      {depotOuvert ? (
        <>
          <p className="mt-3 text-zinc-600">
            Vos jeux et jouets méritent une seconde vie ! Déposez votre liste en quelques clics,
            récupérez votre numéro de vendeur, et venez nous rejoindre le jour du dépôt.
          </p>

          <Link
            href="/vendeur/nouveau"
            className="mx-auto mt-6 flex w-fit items-center rounded-md bg-zinc-900 px-5 py-3 font-medium text-white hover:bg-zinc-800"
          >
            Déposer ma liste
          </Link>

          {parametres?.date_ouverture_troc && (
            <div className="mt-10 text-center">
              <p className="text-sm font-medium text-zinc-600">Jour du dépôt en personne dans :</p>
              <p className="mt-0.5 text-xs text-zinc-400">
                (la liste, elle, se dépose en ligne dès aujourd&apos;hui)
              </p>
              <div className="mt-4 flex justify-center">
                <CompteARebours dateCibleIso={parametres.date_ouverture_troc.replace(" ", "T")} />
              </div>
            </div>
          )}

          {/* Rappel imagé : le compte à rebours ci-dessus concerne le jour du
              dépôt en personne, pas le dépôt de liste — sans ça, beaucoup de
              visiteurs pensent qu'il n'y a rien à faire tant qu'il n'est pas
              à zéro. */}
          <div className="mt-12 overflow-hidden rounded-xl border border-zinc-200">
            <div className="px-5 pb-1 pt-4">
              <h2 className="text-base font-semibold">Comment déposer votre liste ?</h2>
              <p className="mt-0.5 text-sm text-zinc-500">
                5 étapes, à faire depuis chez vous — aucune attente nécessaire.
              </p>
            </div>
            <Image
              src="/guide-depot-liste.jpg"
              alt="Les 5 étapes pour déposer votre liste : préparez vos jeux et jouets, vérifiez et emballez, créez votre liste en ligne, recevez votre numéro de vendeur et votre QR code, vos articles sont prêts."
              width={1671}
              height={941}
              sizes="(max-width: 672px) 100vw, 672px"
              className="mt-3 h-auto w-full"
            />
          </div>
        </>
      ) : (
        <p className="mt-3 whitespace-pre-line text-zinc-600">
          {parametres?.message_depot_termine || MESSAGE_PAR_DEFAUT}
        </p>
      )}
    </main>
  );
}
