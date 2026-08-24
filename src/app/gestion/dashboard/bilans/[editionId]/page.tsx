import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { query, queryOne } from "@/lib/db";
import { dashboardEstConnecte } from "@/lib/gestion";

export const dynamic = "force-dynamic";

type Edition = { annee: number; phase: string };
type Compteurs = {
  vendeurs_non_benevoles: number;
  vendeurs_benevoles: number;
  articles_non_benevoles: number;
  articles_benevoles: number;
  acheteurs: number;
  ventes_901: number;
  ventes_902: number;
};
type Totaux = { total_encaisse: number; total_du_vendeurs: number };
type CaisseEcart = { theorique: number; compte: number | null };

function Stat({ label, valeur }: { label: string; valeur: string | number }) {
  return (
    <div className="rounded-md border border-zinc-200 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{valeur}</p>
    </div>
  );
}

export default async function BilanEditionPage({ params }: { params: Promise<{ editionId: string }> }) {
  if (!(await dashboardEstConnecte())) redirect("/gestion");

  const { editionId } = await params;

  const edition = await queryOne<Edition>("SELECT annee, phase FROM editions WHERE id = ?", [editionId]);
  if (!edition) notFound();

  const compteurs = await queryOne<Compteurs>(
    `SELECT
       COUNT(DISTINCT CASE WHEN p.est_benevole = 0 AND p.numero_vendeur NOT IN (901, 902) THEN p.id END) AS vendeurs_non_benevoles,
       COUNT(DISTINCT CASE WHEN p.est_benevole = 1 THEN p.id END) AS vendeurs_benevoles,
       COUNT(CASE WHEN p.est_benevole = 0 AND p.numero_vendeur NOT IN (901, 902) THEN a.id END) AS articles_non_benevoles,
       COUNT(CASE WHEN p.est_benevole = 1 THEN a.id END) AS articles_benevoles,
       (SELECT COUNT(*) FROM ventes v WHERE v.edition_id = ?) AS acheteurs,
       (SELECT COUNT(*) FROM vente_articles va
          JOIN articles a2 ON a2.id = va.article_id
          JOIN participations p2 ON p2.id = a2.participation_id
          WHERE p2.edition_id = ? AND p2.numero_vendeur = 901 AND va.prix_encaisse > 0) AS ventes_901,
       (SELECT COUNT(*) FROM vente_articles va
          JOIN articles a2 ON a2.id = va.article_id
          JOIN participations p2 ON p2.id = a2.participation_id
          WHERE p2.edition_id = ? AND p2.numero_vendeur = 902 AND va.prix_encaisse > 0) AS ventes_902
     FROM participations p
     LEFT JOIN articles a ON a.participation_id = p.id
     WHERE p.edition_id = ?`,
    [editionId, editionId, editionId, editionId],
  );

  const totaux = await queryOne<Totaux>(
    `SELECT
       COALESCE(SUM(va.prix_encaisse), 0) AS total_encaisse,
       COALESCE(SUM(
         CASE
           WHEN p.numero_vendeur IN (901, 902) THEN 0
           WHEN p.est_benevole = 1 THEN a.prix
           ELSE ROUND(a.prix * (1 - e.taux_vendeur))
         END
       ), 0) AS total_du_vendeurs
     FROM vente_articles va
     JOIN ventes v ON v.id = va.vente_id
     JOIN articles a ON a.id = va.article_id
     JOIN participations p ON p.id = a.participation_id
     JOIN editions e ON e.id = v.edition_id
     WHERE v.edition_id = ?`,
    [editionId],
  );

  const caisses = await query<CaisseEcart>(
    `SELECT
       COALESCE(SUM(va.prix_encaisse), 0) - COALESCE((SELECT SUM(mc.montant) FROM mouvements_caisse mc WHERE mc.caisse_id = c.id), 0) AS theorique,
       c.montant_cloture AS compte
     FROM caisses c
     LEFT JOIN ventes v ON v.caisse_id = c.id
     LEFT JOIN vente_articles va ON va.vente_id = v.id
     WHERE c.edition_id = ?
     GROUP BY c.id, c.montant_cloture`,
    [editionId],
  );

  const totalEncaisse = Number(totaux?.total_encaisse ?? 0);
  const totalDuVendeurs = Number(totaux?.total_du_vendeurs ?? 0);
  const beneficeTheorique = totalEncaisse - totalDuVendeurs;
  const ecartTotal = caisses.reduce(
    (sum, c) => sum + (c.compte != null ? Number(c.compte) - Number(c.theorique) : 0),
    0,
  );
  const beneficeReel = beneficeTheorique + ecartTotal;

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link href="/gestion/dashboard/bilans" className="text-sm text-zinc-500 hover:underline">
        ← Bilans
      </Link>

      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Bilan {edition.annee}</h1>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Vendeurs non-bénévoles" valeur={compteurs?.vendeurs_non_benevoles ?? 0} />
        <Stat label="Vendeurs bénévoles" valeur={compteurs?.vendeurs_benevoles ?? 0} />
        <Stat label="Acheteurs" valeur={compteurs?.acheteurs ?? 0} />
        <Stat label="Articles non-bénévoles" valeur={compteurs?.articles_non_benevoles ?? 0} />
        <Stat label="Articles bénévoles" valeur={compteurs?.articles_benevoles ?? 0} />
        <Stat label="Ventes payées 901" valeur={compteurs?.ventes_901 ?? 0} />
        <Stat label="Ventes payées 902" valeur={compteurs?.ventes_902 ?? 0} />
        <Stat label="Bénéfice théorique" valeur={`${beneficeTheorique}.–`} />
        <Stat label="Bénéfice réel" valeur={`${beneficeReel}.–`} />
      </div>

      {ecartTotal !== 0 && (
        <p className="mt-3 text-sm text-zinc-500">
          Bénéfice réel = bénéfice théorique {ecartTotal > 0 ? "+" : "−"} {Math.abs(ecartTotal)}.– d&apos;écarts de
          clôture caisse cumulés.
        </p>
      )}
    </main>
  );
}
