import { redirect } from "next/navigation";
import Link from "next/link";
import { query, queryOne } from "@/lib/db";
import { dashboardEstConnecte } from "@/lib/gestion";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

type Edition = { id: string; annee: number; taux_vendeur: number };
type VendeurLigne = {
  numero_vendeur: number;
  nom_vendeur: string;
  est_benevole: number;
  nb_ventes: number;
  nb_invendus: number;
  montant_du: number;
};

export default async function ClotureVentePage() {
  if (!(await dashboardEstConnecte())) redirect("/gestion");

  const edition = await queryOne<Edition>("SELECT id, annee, taux_vendeur FROM editions WHERE active_flag = 1");
  if (!edition) redirect("/gestion/dashboard");

  const vendeurs = await query<VendeurLigne>(
    `SELECT
       p.numero_vendeur,
       v.nom AS nom_vendeur,
       p.est_benevole,
       COALESCE(SUM(CASE WHEN a.statut = 'vendu' THEN 1 ELSE 0 END), 0) AS nb_ventes,
       COALESCE(SUM(CASE WHEN a.statut = 'invendu' THEN 1 ELSE 0 END), 0) AS nb_invendus,
       COALESCE(SUM(CASE WHEN a.statut = 'vendu' THEN
         CASE WHEN p.est_benevole = 1 THEN a.prix ELSE ROUND(a.prix * (1 - ?)) END
       ELSE 0 END), 0) AS montant_du
     FROM participations p
     JOIN vendeurs v ON v.id = p.vendeur_id
     LEFT JOIN articles a ON a.participation_id = p.id
     WHERE p.edition_id = ? AND p.numero_vendeur NOT IN (901, 902)
     GROUP BY p.id, p.numero_vendeur, v.nom, p.est_benevole
     HAVING COUNT(a.id) > 0
     ORDER BY p.numero_vendeur`,
    [Number(edition.taux_vendeur), edition.id],
  );

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10 print:m-0 print:max-w-none print:p-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <div>
          <Link href="/gestion/dashboard" className="text-sm text-zinc-500 hover:underline">
            ← Dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Clôture {edition.annee} — {vendeurs.length} étiquette{vendeurs.length > 1 ? "s" : ""}
          </h1>
        </div>
        <PrintButton />
      </div>

      <div className="label-sheet">
        {vendeurs.map((v) => (
          <div key={v.numero_vendeur} className="label label--cloture">
            <div className="label__row">
              <span className="label__vendor">#{v.numero_vendeur}</span>
            </div>
            <div className="label__contact-nom">{v.nom_vendeur}</div>
            <div className="label__cloture-detail">
              {v.nb_ventes} vendu{v.nb_ventes > 1 ? "s" : ""} · {v.nb_invendus} invendu{v.nb_invendus > 1 ? "s" : ""}
            </div>
            <div className="label__cloture-du">Dû : {v.montant_du}.–</div>
            <img src="/meeple.png" alt="" className="label__logo" />
          </div>
        ))}
      </div>
    </main>
  );
}
