import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { queryOne } from "@/lib/db";
import { dashboardEstConnecte } from "@/lib/gestion";
import { historiqueCaisse } from "@/lib/historique";
import { HistoriqueCaisse } from "@/components/HistoriqueCaisse";

export default async function HistoriqueDashboardPage({ params }: { params: Promise<{ numero: string }> }) {
  if (!(await dashboardEstConnecte())) redirect("/gestion");

  const { numero } = await params;
  const numeroInt = Number(numero);
  if (!Number.isInteger(numeroInt) || numeroInt < 1 || numeroInt > 5) notFound();

  const caisse = await queryOne<{ id: string }>(
    `SELECT c.id
     FROM caisses c
     JOIN postes_caisse pc ON pc.id = c.poste_caisse_id
     JOIN editions e ON e.id = c.edition_id
     WHERE pc.numero = ? AND e.active_flag = 1`,
    [numeroInt],
  );

  const lignes = caisse ? await historiqueCaisse(caisse.id) : [];

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-12">
      <Link href="/gestion/dashboard" className="text-sm text-zinc-500 hover:underline">
        ← Dashboard
      </Link>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Historique — Caisse {numeroInt}</h1>
      {!caisse && <p className="mt-3 text-sm text-zinc-500">Pas encore de caisse pour cette édition.</p>}
      {caisse && <HistoriqueCaisse lignes={lignes} />}
    </main>
  );
}
