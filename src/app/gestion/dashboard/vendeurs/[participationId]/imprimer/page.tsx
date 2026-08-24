import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { query, queryOne } from "@/lib/db";
import { dashboardEstConnecte } from "@/lib/gestion";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

type Participation = {
  numero_vendeur: number;
  nom_vendeur: string;
  telephone: string | null;
  email: string | null;
};
type Article = { numero_article: number; nom: string; prix: number; statut: string };

const STATUT_LABELS: Record<string, string> = {
  non_recu: "Non reçu",
  recu: "Reçu",
  vendu: "Vendu",
  invendu: "Invendu",
};

export default async function ImprimerListeVendeurPage({
  params,
}: {
  params: Promise<{ participationId: string }>;
}) {
  if (!(await dashboardEstConnecte())) redirect("/gestion");

  const { participationId } = await params;

  const participation = await queryOne<Participation>(
    `SELECT p.numero_vendeur, v.nom AS nom_vendeur, v.telephone, v.email
     FROM participations p
     JOIN vendeurs v ON v.id = p.vendeur_id
     WHERE p.id = ?`,
    [participationId],
  );
  if (!participation) notFound();

  const articles = await query<Article>(
    "SELECT numero_article, nom, prix, statut FROM articles WHERE participation_id = ? ORDER BY numero_article",
    [participationId],
  );
  const total = articles.reduce((sum, a) => sum + a.prix, 0);

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href="/gestion/dashboard/vendeurs" className="text-sm text-zinc-500 hover:underline">
          ← Vendeurs
        </Link>
        <PrintButton />
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">
        Vendeur #{participation.numero_vendeur} — {participation.nom_vendeur}
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        {participation.telephone || "—"} · {participation.email || "—"}
      </p>

      <h2 className="mt-6 text-lg font-medium">
        {articles.length} article{articles.length > 1 ? "s" : ""} · {total}.–
      </h2>
      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-300 text-left text-zinc-500">
            <th className="py-1 pr-2">N°</th>
            <th className="py-1 pr-2">Objet</th>
            <th className="py-1 pr-2">Prix</th>
            <th className="py-1">Statut</th>
          </tr>
        </thead>
        <tbody>
          {articles.map((a) => (
            <tr key={a.numero_article} className="border-b border-zinc-100">
              <td className="py-1 pr-2 font-mono">{String(a.numero_article).padStart(2, "0")}</td>
              <td className="py-1 pr-2">{a.nom}</td>
              <td className="py-1 pr-2 font-mono">{a.prix}.–</td>
              <td className="py-1">{STATUT_LABELS[a.statut] ?? a.statut}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
