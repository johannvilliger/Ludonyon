import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { formaterMontant } from "@/lib/argent";
import { queryOne } from "@/lib/db";
import { posteCaisseAutorise } from "@/lib/gestion";
import { ClotureCaisseRemboursement } from "./cloture-caisse-remboursement";
import { RechercheRemboursement } from "./recherche-remboursement";
import { remboursementsEffectues, theoriqueCaisseRemboursement } from "./actions";

type Caisse = { id: string; edition_id: string; cloturee: number };

export const dynamic = "force-dynamic";

export default async function RemboursementsPage() {
  const poste = await queryOne<{ numero: number }>("SELECT numero FROM postes_caisse WHERE type = 'remboursement'");
  if (!poste) notFound();

  const autorisation = await posteCaisseAutorise(poste.numero);
  if (!autorisation) redirect("/gestion");

  const caisse = await queryOne<Caisse>(
    `SELECT c.id, c.edition_id, c.cloturee
     FROM caisses c
     JOIN editions e ON e.id = c.edition_id
     WHERE c.poste_caisse_id = ? AND e.active_flag = 1`,
    [autorisation.posteId],
  );

  const theorique = caisse ? await theoriqueCaisseRemboursement(caisse.id) : 0;
  const historique = caisse ? await remboursementsEffectues(caisse.id) : [];

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Remboursements</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Un acheteur ramène un article ? Recherchez sa vente ci-dessous et remboursez-la. L&apos;article redevient
        vendable, et la vente est retirée des bilans — sans jamais toucher aux comptes de la caisse qui l&apos;a
        encaissée à l&apos;origine.
      </p>

      {!caisse && <p className="mt-6 text-sm text-red-600">Aucune édition active pour le moment.</p>}

      {caisse && !caisse.cloturee && (
        <div className="mt-8">
          <RechercheRemboursement caisseId={caisse.id} editionId={caisse.edition_id} />

          <div className="mt-10 border-t border-zinc-200 pt-6">
            <h2 className="text-lg font-semibold">Remboursements déjà effectués ici</h2>
            {historique.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">Aucun pour le moment.</p>
            ) : (
              <ul className="mt-3 divide-y divide-zinc-200 rounded-md border border-zinc-200">
                {historique.map((r, i) => (
                  <li key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span>
                      {r.nom} <span className="text-xs text-zinc-500">(vendeur n° {r.numeroVendeur})</span>
                    </span>
                    <span className="font-medium">{formaterMontant(r.montant)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-8 border-t border-zinc-200 pt-4">
            <ClotureCaisseRemboursement
              caisseId={caisse.id}
              posteId={autorisation.posteId}
              montantTheorique={theorique}
            />
          </div>
        </div>
      )}

      {caisse && Boolean(caisse.cloturee) && (
        <p className="mt-6 text-sm text-zinc-500">Ce poste de remboursement a été clôturé pour cette édition.</p>
      )}

      <Link href="/gestion" className="mt-8 block text-sm text-zinc-500 hover:underline">
        ← /gestion
      </Link>
    </main>
  );
}
