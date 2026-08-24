import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { queryOne } from "@/lib/db";
import { posteCaisseAutorise } from "@/lib/gestion";
import { CaisseScanner } from "./caisse-scanner";
import { ClotureCaisse } from "./cloture-caisse";
import { InstructionsCaisse } from "./instructions-modal";

type Caisse = { id: string; edition_id: string; taux_achat: number; cloturee: number; instructions_vues: number };

export const dynamic = "force-dynamic";

export default async function CaisseDetailPage({ params }: { params: Promise<{ numero: string }> }) {
  const { numero } = await params;
  const numeroInt = Number(numero);
  if (!Number.isInteger(numeroInt) || numeroInt < 1 || numeroInt > 5) notFound();

  const autorisation = await posteCaisseAutorise(numeroInt);
  if (!autorisation) redirect("/gestion");

  const caisse = await queryOne<Caisse>(
    `SELECT c.id, c.edition_id, e.taux_achat, c.cloturee, c.instructions_vues
     FROM caisses c
     JOIN editions e ON e.id = c.edition_id
     WHERE c.poste_caisse_id = ? AND e.active_flag = 1`,
    [autorisation.posteId],
  );

  const theorique = caisse
    ? await queryOne<{ ventes: number; vidages: number }>(
        `SELECT
           COALESCE((SELECT SUM(va.prix_encaisse) FROM vente_articles va JOIN ventes v ON v.id = va.vente_id WHERE v.caisse_id = ?), 0) AS ventes,
           COALESCE((SELECT SUM(mc.montant) FROM mouvements_caisse mc WHERE mc.caisse_id = ?), 0) AS vidages`,
        [caisse.id, caisse.id],
      )
    : null;
  const montantTheorique = theorique ? Number(theorique.ventes) - Number(theorique.vidages) : 0;

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Caisse {numeroInt}</h1>
        <Link href={`/caisse/${numeroInt}/historique`} className="text-sm text-zinc-500 hover:underline">
          Historique →
        </Link>
      </div>

      {!caisse && <p className="mt-6 text-sm text-red-600">Aucune édition active pour le moment.</p>}

      {caisse && !caisse.cloturee && (
        <div className="mt-8">
          <InstructionsCaisse posteId={autorisation.posteId} dejaVues={Boolean(caisse.instructions_vues)} />
          <div className="mt-4">
            <CaisseScanner caisseId={caisse.id} editionId={caisse.edition_id} tauxAchat={Number(caisse.taux_achat)} />
          </div>
          <div className="mt-8 border-t border-zinc-200 pt-4">
            <ClotureCaisse caisseId={caisse.id} posteId={autorisation.posteId} montantTheorique={montantTheorique} />
          </div>
        </div>
      )}

      {caisse && Boolean(caisse.cloturee) && (
        <p className="mt-6 text-sm text-zinc-500">Cette caisse a été clôturée pour cette édition.</p>
      )}
    </main>
  );
}
