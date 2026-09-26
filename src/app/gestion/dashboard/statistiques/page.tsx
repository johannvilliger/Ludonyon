import { redirect } from "next/navigation";
import Link from "next/link";
import { query, queryOne } from "@/lib/db";
import { dashboardEstConnecte } from "@/lib/gestion";

export const dynamic = "force-dynamic";

type JourVisites = { jour: string; uniques: number; vues: number };

function formaterJour(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-CH", { weekday: "short", day: "2-digit", month: "2-digit" });
}

export default async function StatistiquesPage() {
  if (!(await dashboardEstConnecte())) redirect("/gestion");

  const edition = await queryOne<{ date_depot: string | null }>(
    "SELECT date_depot FROM editions WHERE active_flag = 1",
  );

  const parJour = await query<JourVisites>(
    `SELECT DATE(created_at) AS jour, COUNT(DISTINCT visiteur_hash) AS uniques, COUNT(*) AS vues
     FROM visites GROUP BY DATE(created_at) ORDER BY jour DESC LIMIT 60`,
  );

  const totalDepuisDepot = edition?.date_depot
    ? await queryOne<{ uniques: number }>(
        "SELECT COUNT(DISTINCT visiteur_hash) AS uniques FROM visites WHERE created_at >= ?",
        [edition.date_depot],
      )
    : null;

  const totalGeneral = await queryOne<{ uniques: number }>(
    "SELECT COUNT(DISTINCT visiteur_hash) AS uniques FROM visites",
  );

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <Link href="/gestion/dashboard" className="text-sm text-zinc-500 hover:underline">
        ← Dashboard
      </Link>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Visiteurs de la page d&apos;accueil</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Comptage anonyme (IP + navigateur + jour, sans cookie ni identifiant persistant) : un même
        visiteur ne compte qu&apos;une fois par jour, mais n&apos;est jamais reconnaissable d&apos;un jour à
        l&apos;autre.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4">
        {totalDepuisDepot && (
          <div className="rounded-md border border-zinc-200 p-4">
            <p className="text-sm text-zinc-500">Depuis l&apos;ouverture du dépôt</p>
            <p className="mt-1 text-2xl font-semibold">{totalDepuisDepot.uniques}</p>
          </div>
        )}
        <div className="rounded-md border border-zinc-200 p-4">
          <p className="text-sm text-zinc-500">Total (toutes éditions)</p>
          <p className="mt-1 text-2xl font-semibold">{totalGeneral?.uniques ?? 0}</p>
        </div>
      </div>

      {parJour.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-500">Aucune visite enregistrée pour le moment.</p>
      ) : (
        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-zinc-500">
              <th className="py-2 font-medium">Jour</th>
              <th className="py-2 font-medium">Visiteurs uniques</th>
              <th className="py-2 font-medium">Vues</th>
            </tr>
          </thead>
          <tbody>
            {parJour.map((j) => (
              <tr key={j.jour} className="border-b border-zinc-100">
                <td className="py-2">{formaterJour(j.jour)}</td>
                <td className="py-2 font-medium">{j.uniques}</td>
                <td className="py-2 text-zinc-500">{j.vues}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
