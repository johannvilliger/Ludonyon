import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { queryOne } from "@/lib/db";
import { posteCaisseAutorise } from "@/lib/gestion";
import { CaisseScanner } from "./caisse-scanner";

type Caisse = { id: string; edition_id: string; taux_achat: number };

export default async function CaisseDetailPage({ params }: { params: Promise<{ numero: string }> }) {
  const { numero } = await params;
  const numeroInt = Number(numero);
  if (!Number.isInteger(numeroInt) || numeroInt < 1 || numeroInt > 5) notFound();

  const autorisation = await posteCaisseAutorise(numeroInt);
  if (!autorisation) redirect("/gestion");

  const caisse = await queryOne<Caisse>(
    `SELECT c.id, c.edition_id, e.taux_achat
     FROM caisses c
     JOIN editions e ON e.id = c.edition_id
     WHERE c.poste_caisse_id = ? AND e.active_flag = 1`,
    [autorisation.posteId],
  );

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Caisse {numeroInt}</h1>
        <Link href={`/caisse/${numeroInt}/historique`} className="text-sm text-zinc-500 hover:underline">
          Historique →
        </Link>
      </div>

      {!caisse && <p className="mt-6 text-sm text-red-600">Aucune édition active pour le moment.</p>}

      {caisse && (
        <div className="mt-8">
          <CaisseScanner caisseId={caisse.id} editionId={caisse.edition_id} tauxAchat={Number(caisse.taux_achat)} />
        </div>
      )}
    </main>
  );
}
