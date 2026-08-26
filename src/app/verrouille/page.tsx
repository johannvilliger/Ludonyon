import { queryOne } from "@/lib/db";
import { CountdownVerrouillage } from "./countdown";

export const dynamic = "force-dynamic";

export default async function SiteVerrouillePage() {
  const parametres = await queryOne<{ date_ouverture_troc: string | null }>(
    "SELECT date_ouverture_troc FROM parametres_gestion WHERE id = 1",
  );

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-12 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Notre troc n&apos;est pas encore ouvert</h1>
      <p className="mt-3 text-zinc-600">Merci de revenir plus tard !</p>

      {parametres?.date_ouverture_troc && (
        <div className="mt-10">
          <CountdownVerrouillage dateCibleIso={parametres.date_ouverture_troc.replace(" ", "T")} />
        </div>
      )}
    </main>
  );
}
