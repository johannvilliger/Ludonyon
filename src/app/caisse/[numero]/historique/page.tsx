import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { queryOne } from "@/lib/db";
import { posteCaisseAutorise } from "@/lib/gestion";
import { historiqueVentesCaisse } from "@/lib/historique";
import { HistoriqueVentes } from "@/components/HistoriqueVentes";

export default async function HistoriqueCaissePage({ params }: { params: Promise<{ numero: string }> }) {
  const { numero } = await params;
  const numeroInt = Number(numero);
  if (!Number.isInteger(numeroInt) || numeroInt < 1 || numeroInt > 5) notFound();

  const autorisation = await posteCaisseAutorise(numeroInt);
  if (!autorisation) redirect("/gestion");

  const caisse = await queryOne<{ id: string }>(
    `SELECT c.id
     FROM caisses c
     JOIN editions e ON e.id = c.edition_id
     WHERE c.poste_caisse_id = ? AND e.active_flag = 1`,
    [autorisation.posteId],
  );

  const lignes = caisse ? await historiqueVentesCaisse(caisse.id) : [];

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-12">
      <Link href={`/caisse/${numeroInt}`} className="text-sm text-zinc-500 hover:underline">
        ← Caisse {numeroInt}
      </Link>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Historique</h1>
      {!caisse && <p className="mt-3 text-sm text-zinc-500">Aucune édition active pour le moment.</p>}
      {caisse && <HistoriqueVentes lignes={lignes} />}
    </main>
  );
}
