import Link from "next/link";
import { CompteARebours } from "@/components/CompteARebours";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const parametres = await queryOne<{ date_ouverture_troc: string | null }>(
    "SELECT date_ouverture_troc FROM parametres_gestion WHERE id = 1",
  );

  return (
    <main className="mx-auto w-full flex max-w-2xl flex-1 flex-col justify-center px-6 py-12">
      <h1 className="text-4xl font-semibold tracking-tight">Troc de la Ludothèque Nyon Région</h1>
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
        className="mt-8 inline-flex w-fit items-center rounded-md bg-zinc-900 px-5 py-3 font-medium text-white hover:bg-zinc-800"
      >
        Déposer ma liste
      </Link>
    </main>
  );
}
