import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { arrondiCentimes, formaterMontant } from "@/lib/argent";
import { query, queryOne } from "@/lib/db";
import { dashboardEstConnecte } from "@/lib/gestion";

export const dynamic = "force-dynamic";

type Edition = { annee: number; phase: string };
type Compteurs = {
  vendeurs_non_benevoles: number;
  vendeurs_benevoles: number;
  articles_non_benevoles: number;
  articles_benevoles: number;
  objets_vendus_non_benevoles: number;
  objets_vendus_benevoles: number;
  acheteurs: number;
  objets_vendus_901: number;
  objets_vendus_902: number;
  objets_donnes_901_902: number;
};
type Totaux = { total_encaisse: number; total_du_vendeurs: number };
type CaisseEcart = { numero: number; cloturee: number; theorique: number; compte: number | null };
type VendeurLigne = {
  participation_id: string;
  numero_vendeur: number;
  nom_vendeur: string;
  telephone: string | null;
  email: string | null;
  est_benevole: number;
};
type ArticleLigne = {
  participation_id: string;
  numero_article: number;
  nom: string;
  prix: number;
  statut: string;
  categorie: string | null;
};

const STATUT_LABELS: Record<string, string> = {
  non_recu: "Non reçu",
  recu: "Reçu",
  vendu: "Vendu",
  invendu: "Invendu",
  refuse: "Refusé",
};

const STATUT_STYLES: Record<string, string> = {
  non_recu: "bg-zinc-100 text-zinc-600",
  recu: "bg-emerald-100 text-emerald-800",
  vendu: "bg-blue-100 text-blue-800",
  invendu: "bg-amber-100 text-amber-800",
  refuse: "bg-red-100 text-red-800",
};

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
       COUNT(DISTINCT CASE WHEN p.est_benevole = 1 AND a.statut = 'vendu' THEN p.id END) AS vendeurs_benevoles,
       COUNT(CASE WHEN p.est_benevole = 0 AND p.numero_vendeur NOT IN (901, 902) THEN a.id END) AS articles_non_benevoles,
       COUNT(CASE WHEN p.est_benevole = 1 THEN a.id END) AS articles_benevoles,
       COUNT(CASE WHEN p.est_benevole = 0 AND p.numero_vendeur NOT IN (901, 902) AND a.statut = 'vendu' THEN a.id END) AS objets_vendus_non_benevoles,
       COUNT(CASE WHEN p.est_benevole = 1 AND p.numero_vendeur NOT IN (901, 902) AND a.statut = 'vendu' THEN a.id END) AS objets_vendus_benevoles,
       (SELECT COUNT(*) FROM ventes v WHERE v.edition_id = ?) AS acheteurs,
       (SELECT COUNT(*) FROM vente_articles va
          JOIN articles a2 ON a2.id = va.article_id
          JOIN participations p2 ON p2.id = a2.participation_id
          WHERE p2.edition_id = ? AND p2.numero_vendeur = 901 AND va.prix_encaisse > 0) AS objets_vendus_901,
       (SELECT COUNT(*) FROM vente_articles va
          JOIN articles a2 ON a2.id = va.article_id
          JOIN participations p2 ON p2.id = a2.participation_id
          WHERE p2.edition_id = ? AND p2.numero_vendeur = 902 AND va.prix_encaisse > 0) AS objets_vendus_902,
       (SELECT COUNT(*) FROM vente_articles va
          JOIN articles a2 ON a2.id = va.article_id
          JOIN participations p2 ON p2.id = a2.participation_id
          WHERE p2.edition_id = ? AND p2.numero_vendeur IN (901, 902) AND va.prix_encaisse = 0) AS objets_donnes_901_902
     FROM participations p
     LEFT JOIN articles a ON a.participation_id = p.id
     WHERE p.edition_id = ?`,
    [editionId, editionId, editionId, editionId, editionId],
  );

  const totaux = await queryOne<Totaux>(
    `SELECT
       COALESCE(SUM(va.prix_encaisse), 0) AS total_encaisse,
       COALESCE(SUM(
         CASE
           WHEN p.numero_vendeur IN (901, 902) THEN 0
           WHEN p.est_benevole = 1 THEN a.prix
           ELSE ROUND(a.prix * (1 - e.taux_vendeur), 2)
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
       pc.numero,
       c.cloturee,
       COALESCE(SUM(va.prix_encaisse), 0) - COALESCE((SELECT SUM(mc.montant) FROM mouvements_caisse mc WHERE mc.caisse_id = c.id), 0) AS theorique,
       c.montant_cloture AS compte
     FROM caisses c
     JOIN postes_caisse pc ON pc.id = c.poste_caisse_id
     LEFT JOIN ventes v ON v.caisse_id = c.id
     LEFT JOIN vente_articles va ON va.vente_id = v.id
     WHERE c.edition_id = ?
     GROUP BY c.id, pc.numero, c.cloturee, c.montant_cloture
     ORDER BY pc.numero`,
    [editionId],
  );

  const vendeurs = await query<VendeurLigne>(
    `SELECT p.id AS participation_id, p.numero_vendeur, v.nom AS nom_vendeur, v.telephone, v.email, p.est_benevole
     FROM participations p
     JOIN vendeurs v ON v.id = p.vendeur_id
     WHERE p.edition_id = ?
     ORDER BY p.numero_vendeur`,
    [editionId],
  );

  const articles = await query<ArticleLigne>(
    `SELECT a.participation_id, a.numero_article, a.nom, a.prix, a.statut, c.nom AS categorie
     FROM articles a
     JOIN participations p ON p.id = a.participation_id
     LEFT JOIN categories c ON c.id = a.categorie_id
     WHERE p.edition_id = ?
     ORDER BY a.numero_article`,
    [editionId],
  );

  const articlesParVendeur = new Map<string, ArticleLigne[]>();
  for (const a of articles) {
    const liste = articlesParVendeur.get(a.participation_id) ?? [];
    liste.push(a);
    articlesParVendeur.set(a.participation_id, liste);
  }

  const totalEncaisse = Number(totaux?.total_encaisse ?? 0);
  const totalDuVendeurs = Number(totaux?.total_du_vendeurs ?? 0);
  const beneficeTheorique = arrondiCentimes(totalEncaisse - totalDuVendeurs);
  const ecartTotal = arrondiCentimes(
    caisses.reduce((sum, c) => sum + (c.compte != null ? Number(c.compte) - Number(c.theorique) : 0), 0),
  );
  const beneficeReel = arrondiCentimes(beneficeTheorique + ecartTotal);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link href="/gestion/dashboard/bilans" className="text-sm text-zinc-500 hover:underline">
        ← Bilans
      </Link>

      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Bilan {edition.annee}</h1>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Vendeurs non-bénévoles" valeur={compteurs?.vendeurs_non_benevoles ?? 0} />
        <Stat label="Articles non-bénévoles" valeur={compteurs?.articles_non_benevoles ?? 0} />
        <Stat label="Objets vendus non-bénévoles" valeur={compteurs?.objets_vendus_non_benevoles ?? 0} />

        <Stat label="Vendeurs bénévoles ayant vendu" valeur={compteurs?.vendeurs_benevoles ?? 0} />
        <Stat label="Articles bénévoles" valeur={compteurs?.articles_benevoles ?? 0} />
        <Stat label="Objets vendus bénévoles (hors 901/902)" valeur={compteurs?.objets_vendus_benevoles ?? 0} />

        <Stat label="Objets vendus 901" valeur={compteurs?.objets_vendus_901 ?? 0} />
        <Stat label="Objets vendus 902" valeur={compteurs?.objets_vendus_902 ?? 0} />
        <Stat label="Objets donnés 901+902" valeur={compteurs?.objets_donnes_901_902 ?? 0} />

        <Stat label="Bénéfice théorique" valeur={formaterMontant(beneficeTheorique)} />
        <Stat label="Bénéfice réel" valeur={formaterMontant(beneficeReel)} />
        <Stat label="Acheteurs" valeur={compteurs?.acheteurs ?? 0} />
      </div>

      {ecartTotal !== 0 && (
        <p className="mt-3 text-sm text-zinc-500">
          Bénéfice réel = bénéfice théorique {ecartTotal > 0 ? "+" : "−"} {formaterMontant(Math.abs(ecartTotal))} d&apos;écarts de
          clôture caisse cumulés.
        </p>
      )}

      {/* État des caisses : consultation seule, utile pour revenir sur une
          édition terminée sans pouvoir la modifier. */}
      {caisses.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-medium">Caisses</h2>
          <ul className="mt-3 divide-y divide-zinc-200 rounded-md border border-zinc-200">
            {caisses.map((c) => {
              const theorique = arrondiCentimes(Number(c.theorique));
              const compte = c.compte != null ? Number(c.compte) : null;
              const ecart = compte != null ? arrondiCentimes(compte - theorique) : null;
              return (
                <li key={c.numero} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="font-medium">Caisse {c.numero}</span>
                  <span className="text-zinc-500">
                    {c.cloturee ? "Clôturée" : "Non clôturée"} · Théorique {formaterMontant(theorique)} · Compté{" "}
                    {compte != null ? formaterMontant(compte) : "—"}
                    {ecart != null && ecart !== 0 && (
                      <span className="ml-1 font-medium text-red-600">
                        (écart {ecart > 0 ? "+" : ""}
                        {formaterMontant(ecart)})
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Liste des vendeurs et de leurs articles : consultation seule, pas
          de bouton d'action (classification IA, contrôle, refus...) — ça n'a
          plus de sens une fois l'édition passée. */}
      {vendeurs.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-medium">Vendeurs</h2>
          <div className="mt-3 space-y-4">
            {vendeurs.map((v) => {
              const liste = articlesParVendeur.get(v.participation_id) ?? [];
              const total = liste.reduce((sum, a) => sum + a.prix, 0);
              return (
                <details key={v.participation_id} className="rounded-md border border-zinc-200 p-4">
                  <summary className="flex cursor-pointer items-center justify-between text-sm font-medium">
                    <span>
                      Vendeur #{v.numero_vendeur} — {v.nom_vendeur}
                      {Boolean(v.est_benevole) && <span className="ml-2 text-xs text-amber-700">(bénévole)</span>}
                      <span className="block text-xs font-normal text-zinc-500">
                        {v.telephone || "—"}
                        {v.email && ` · ${v.email}`}
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="text-zinc-500">
                        {liste.length} article{liste.length > 1 ? "s" : ""} · {total}.–
                      </span>
                      <Link
                        href={`/gestion/dashboard/vendeurs/${v.participation_id}/imprimer`}
                        className="rounded border border-zinc-300 px-2 py-1 text-xs font-normal hover:border-zinc-400"
                      >
                        Imprimer
                      </Link>
                    </span>
                  </summary>
                  <ul className="mt-3 divide-y divide-zinc-200">
                    {liste.map((a) => (
                      <li key={a.numero_article} className="flex items-center justify-between py-2 text-sm">
                        <span>
                          {String(a.numero_article).padStart(2, "0")} — {a.nom}
                          {a.categorie && (
                            <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500">
                              {a.categorie}
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{a.prix}.–</span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUT_STYLES[a.statut] ?? "bg-zinc-100 text-zinc-600"}`}
                          >
                            {STATUT_LABELS[a.statut] ?? a.statut}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </details>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
