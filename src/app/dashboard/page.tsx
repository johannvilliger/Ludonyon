import { query, queryOne } from "@/lib/db";
import { VidageForm } from "./vidage-form";

// Toujours refléter les ventes/le cash courants — jamais prérendu au build.
export const dynamic = "force-dynamic";

type Edition = { id: string; annee: number; taux_vendeur: number };
type CaisseAgregee = {
  id: string;
  nom: string;
  fond_initial: number;
  total_ventes: number;
  total_vidages: number;
};
type Totaux = { total_encaisse: number; total_du_vendeurs: number };

export default async function DashboardPage() {
  const edition = await queryOne<Edition>("SELECT id, annee, taux_vendeur FROM editions WHERE statut = 'ouverte' LIMIT 1");

  if (!edition) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-4 text-sm text-red-600">Aucune édition n&apos;est ouverte actuellement.</p>
      </main>
    );
  }

  const caisses = await query<CaisseAgregee>(
    `SELECT
       c.id,
       c.nom,
       c.fond_initial,
       COALESCE(SUM(va.prix_encaisse), 0) AS total_ventes,
       COALESCE((SELECT SUM(mc.montant) FROM mouvements_caisse mc WHERE mc.caisse_id = c.id), 0) AS total_vidages
     FROM caisses c
     LEFT JOIN ventes v ON v.caisse_id = c.id
     LEFT JOIN vente_articles va ON va.vente_id = v.id
     WHERE c.edition_id = ?
     GROUP BY c.id, c.nom, c.fond_initial
     ORDER BY c.nom`,
    [edition.id],
  );

  const totaux = await queryOne<Totaux>(
    `SELECT
       COALESCE(SUM(va.prix_encaisse), 0) AS total_encaisse,
       COALESCE(SUM(
         CASE WHEN p.est_benevole = 1 THEN a.prix ELSE ROUND(a.prix * (1 - e.taux_vendeur)) END
       ), 0) AS total_du_vendeurs
     FROM vente_articles va
     JOIN ventes v ON v.id = va.vente_id
     JOIN articles a ON a.id = va.article_id
     JOIN participations p ON p.id = a.participation_id
     JOIN editions e ON e.id = v.edition_id
     WHERE v.edition_id = ?`,
    [edition.id],
  );

  const totalEncaisse = Number(totaux?.total_encaisse ?? 0);
  const totalDuVendeurs = Number(totaux?.total_du_vendeurs ?? 0);
  const benefice = totalEncaisse - totalDuVendeurs;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Dashboard — édition {edition.annee}</h1>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-md border border-zinc-200 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Encaissé</p>
          <p className="mt-1 text-2xl font-semibold">{totalEncaisse}.–</p>
        </div>
        <div className="rounded-md border border-zinc-200 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Dû aux vendeurs</p>
          <p className="mt-1 text-2xl font-semibold">{totalDuVendeurs}.–</p>
        </div>
        <div className="rounded-md border border-zinc-200 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Bénéfice</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700">{benefice}.–</p>
        </div>
      </div>

      <h2 className="mt-8 text-lg font-medium">Caisses</h2>
      {caisses.length === 0 && <p className="mt-3 text-sm text-zinc-500">Aucune caisse ouverte pour l&apos;instant.</p>}
      <ul className="mt-3 space-y-3">
        {caisses.map((c) => {
          const ventes = Number(c.total_ventes);
          const vidages = Number(c.total_vidages);
          const cashEnCaisse = c.fond_initial + ventes - vidages;
          return (
            <li key={c.id} className="rounded-md border border-zinc-200 p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">{c.nom}</span>
                <span className="text-sm text-zinc-500">Ventes : {ventes}.–</span>
              </div>
              <p className="mt-1 text-sm text-zinc-600">
                Cash en caisse : <span className="font-mono">{cashEnCaisse}.–</span>
                <span className="text-zinc-400"> (fonds {c.fond_initial}.– − vidages {vidages}.–)</span>
              </p>
              <VidageForm caisseId={c.id} />
            </li>
          );
        })}
      </ul>
    </main>
  );
}
