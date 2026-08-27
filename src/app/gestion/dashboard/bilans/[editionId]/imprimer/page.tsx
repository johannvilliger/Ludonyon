import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { formaterMontant } from "@/lib/argent";
import { query, queryOne } from "@/lib/db";
import { dashboardEstConnecte } from "@/lib/gestion";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

type Edition = { annee: number; taux_vendeur: number };
type VendeurLigne = {
  numero_vendeur: number;
  nom_vendeur: string;
  telephone: string | null;
  email: string | null;
  est_benevole: number;
  nb_articles: number;
  nb_vendus: number;
  montant_recu: number;
};

export default async function ImprimerBilanVendeursPage({
  params,
}: {
  params: Promise<{ editionId: string }>;
}) {
  if (!(await dashboardEstConnecte())) redirect("/gestion");

  const { editionId } = await params;

  const edition = await queryOne<Edition>("SELECT annee, taux_vendeur FROM editions WHERE id = ?", [editionId]);
  if (!edition) notFound();

  // Montant reçu par le vendeur (ce qu'il touche dans son enveloppe) : même
  // règle que la clôture de vente — rien pour 901/902 (pas de vrai vendeur
  // derrière), prix plein pour un bénévole, prix moins la part du troc sinon.
  const vendeurs = await query<VendeurLigne>(
    `SELECT
       p.numero_vendeur,
       v.nom AS nom_vendeur,
       v.telephone,
       v.email,
       p.est_benevole,
       COUNT(a.id) AS nb_articles,
       COALESCE(SUM(CASE WHEN a.statut = 'vendu' THEN 1 ELSE 0 END), 0) AS nb_vendus,
       COALESCE(SUM(CASE WHEN a.statut = 'vendu' THEN
         CASE
           WHEN p.numero_vendeur IN (901, 902) THEN 0
           WHEN p.est_benevole = 1 THEN a.prix
           ELSE ROUND(a.prix * (1 - ?), 2)
         END
       ELSE 0 END), 0) AS montant_recu
     FROM participations p
     JOIN vendeurs v ON v.id = p.vendeur_id
     LEFT JOIN articles a ON a.participation_id = p.id
     WHERE p.edition_id = ?
     GROUP BY p.id, p.numero_vendeur, v.nom, v.telephone, v.email, p.est_benevole
     ORDER BY p.numero_vendeur`,
    [Number(edition.taux_vendeur), editionId],
  );

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10 print:max-w-none">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href={`/gestion/dashboard/bilans/${editionId}`} className="text-sm text-zinc-500 hover:underline">
          ← Bilan {edition.annee}
        </Link>
        <PrintButton />
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">Liste des vendeurs — {edition.annee}</h1>

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-300 text-left text-zinc-500">
            <th className="py-1 pr-2">N°</th>
            <th className="py-1 pr-2">Vendeur</th>
            <th className="py-1 pr-2">Téléphone</th>
            <th className="py-1 pr-2">Email</th>
            <th className="py-1 pr-2 text-right">En vente</th>
            <th className="py-1 pr-2 text-right">Vendus</th>
            <th className="py-1 text-right">Reçu</th>
          </tr>
        </thead>
        <tbody>
          {vendeurs.map((v) => (
            <tr key={v.numero_vendeur} className="border-b border-zinc-100">
              <td className="py-1 pr-2 font-mono">{v.numero_vendeur}</td>
              <td className="py-1 pr-2">
                {v.nom_vendeur}
                {Boolean(v.est_benevole) && <span className="ml-1 text-xs text-amber-700">(bénévole)</span>}
              </td>
              <td className="py-1 pr-2">{v.telephone || "—"}</td>
              <td className="py-1 pr-2">{v.email || "—"}</td>
              <td className="py-1 pr-2 text-right font-mono">{v.nb_articles}</td>
              <td className="py-1 pr-2 text-right font-mono">{v.nb_vendus}</td>
              <td className="py-1 text-right font-mono">{formaterMontant(Number(v.montant_recu))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
