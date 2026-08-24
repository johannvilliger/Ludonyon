import { redirect } from "next/navigation";
import Link from "next/link";
import { query, queryOne } from "@/lib/db";
import { dashboardEstConnecte } from "@/lib/gestion";

export const dynamic = "force-dynamic";

type Edition = { id: string; annee: number };
type VendeurLigne = {
  participation_id: string;
  numero_vendeur: number;
  nom_vendeur: string;
  est_benevole: number;
};
type ArticleLigne = {
  participation_id: string;
  numero_article: number;
  nom: string;
  prix: number;
  statut: string;
};

const STATUT_LABELS: Record<string, string> = {
  non_recu: "Non reçu",
  recu: "Reçu",
  vendu: "Vendu",
  invendu: "Invendu",
};

const STATUT_STYLES: Record<string, string> = {
  non_recu: "bg-zinc-100 text-zinc-600",
  recu: "bg-emerald-100 text-emerald-800",
  vendu: "bg-blue-100 text-blue-800",
  invendu: "bg-amber-100 text-amber-800",
};

export default async function VendeursDashboardPage() {
  if (!(await dashboardEstConnecte())) redirect("/gestion");

  const edition = await queryOne<Edition>("SELECT id, annee FROM editions WHERE active_flag = 1");

  const vendeurs = edition
    ? await query<VendeurLigne>(
        `SELECT p.id AS participation_id, p.numero_vendeur, v.nom AS nom_vendeur, p.est_benevole
         FROM participations p
         JOIN vendeurs v ON v.id = p.vendeur_id
         WHERE p.edition_id = ?
         ORDER BY p.numero_vendeur`,
        [edition.id],
      )
    : [];

  const articles = edition
    ? await query<ArticleLigne>(
        `SELECT a.participation_id, a.numero_article, a.nom, a.prix, a.statut
         FROM articles a
         JOIN participations p ON p.id = a.participation_id
         WHERE p.edition_id = ?
         ORDER BY a.numero_article`,
        [edition.id],
      )
    : [];

  const articlesParVendeur = new Map<string, ArticleLigne[]>();
  for (const a of articles) {
    const liste = articlesParVendeur.get(a.participation_id) ?? [];
    liste.push(a);
    articlesParVendeur.set(a.participation_id, liste);
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Link href="/gestion/dashboard" className="text-sm text-zinc-500 hover:underline">
        ← Dashboard
      </Link>

      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Vendeurs</h1>

      {!edition && <p className="mt-6 text-sm text-zinc-500">Aucune édition active.</p>}

      {edition && vendeurs.length === 0 && (
        <p className="mt-6 text-sm text-zinc-500">Aucun vendeur pour cette édition.</p>
      )}

      <div className="mt-6 space-y-4">
        {vendeurs.map((v) => {
          const liste = articlesParVendeur.get(v.participation_id) ?? [];
          const total = liste.reduce((sum, a) => sum + a.prix, 0);
          return (
            <details key={v.participation_id} className="rounded-md border border-zinc-200 p-4">
              <summary className="flex cursor-pointer items-center justify-between text-sm font-medium">
                <span>
                  Vendeur #{v.numero_vendeur} — {v.nom_vendeur}
                  {Boolean(v.est_benevole) && <span className="ml-2 text-xs text-amber-700">(bénévole)</span>}
                </span>
                <span className="text-zinc-500">
                  {liste.length} article{liste.length > 1 ? "s" : ""} · {total}.–
                </span>
              </summary>
              <ul className="mt-3 divide-y divide-zinc-200">
                {liste.map((a) => (
                  <li key={a.numero_article} className="flex items-center justify-between py-2 text-sm">
                    <span>
                      {String(a.numero_article).padStart(2, "0")} — {a.nom}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{a.prix}.–</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUT_STYLES[a.statut] ?? "bg-zinc-100 text-zinc-600"}`}>
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
    </main>
  );
}
