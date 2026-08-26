import { CompteARebours } from "@/components/CompteARebours";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SiteVerrouillePage() {
  const parametres = await queryOne<{ date_ouverture_troc: string | null }>(
    "SELECT date_ouverture_troc FROM parametres_gestion WHERE id = 1",
  );

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-12 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Notre troc n&apos;est pas encore ouvert</h1>

      {parametres?.date_ouverture_troc ? (
        <div className="mt-8">
          <p className="text-sm font-medium text-zinc-600">Début de notre troc annuel dans :</p>
          <div className="mt-4">
            <CompteARebours dateCibleIso={parametres.date_ouverture_troc.replace(" ", "T")} />
          </div>
        </div>
      ) : (
        <p className="mt-3 text-zinc-600">Merci de revenir plus tard !</p>
      )}
    </main>
  );
}
