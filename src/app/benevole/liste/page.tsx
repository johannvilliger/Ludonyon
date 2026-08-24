import { redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { benevoleConnecte } from "@/lib/benevole-session";
import { deconnexionBenevole } from "../actions";
import { AjouterArticleBenevoleForm } from "./ajouter-article-form";
import { ArticleEditableRowBenevole } from "./article-editable-row";

export const dynamic = "force-dynamic";

type Article = { id: string; numero_article: number; nom: string; prix: number; statut: string };

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

export default async function BenevoleListePage() {
  const session = await benevoleConnecte();
  if (!session) redirect("/benevole");

  const participation = await queryOne<{ id: string }>(
    `SELECT p.id FROM participations p JOIN editions e ON e.id = p.edition_id WHERE p.vendeur_id = ? AND e.active_flag = 1`,
    [session.vendeurId],
  );

  const articles = participation
    ? await query<Article>(
        "SELECT id, numero_article, nom, prix, statut FROM articles WHERE participation_id = ? ORDER BY numero_article",
        [participation.id],
      )
    : [];
  const total = articles.reduce((sum, a) => sum + a.prix, 0);

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">
          {session.nom} — n° {session.numeroFixe}
        </h1>
        <form action={deconnexionBenevole}>
          <button
            type="submit"
            className="shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:border-zinc-400"
          >
            Déconnexion
          </button>
        </form>
      </div>

      {!participation && (
        <p className="mt-6 text-sm text-zinc-500">Aucune édition active pour le moment.</p>
      )}

      {participation && (
        <>
          <h2 className="mt-8 text-lg font-medium">
            {articles.length} article{articles.length > 1 ? "s" : ""} · {total} CHF
          </h2>
          <ul className="mt-3 divide-y divide-zinc-200">
            {articles.map((a) => {
              // Une fois réceptionné (ou vendu/invendu/refusé), seul le
              // staff corrige encore quelque chose, depuis l'accueil.
              const modifiable = a.statut === "non_recu";
              return (
                <li key={a.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="w-6 shrink-0 text-zinc-400">
                    {String(a.numero_article).padStart(2, "0")}
                  </span>
                  {modifiable ? (
                    <ArticleEditableRowBenevole articleId={a.id} nomInitial={a.nom} prixInitial={a.prix} />
                  ) : (
                    <span className="flex-1">
                      {a.nom} <span className="font-mono text-zinc-500">{a.prix}.–</span>
                    </span>
                  )}
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUT_STYLES[a.statut] ?? "bg-zinc-100 text-zinc-600"}`}
                  >
                    {STATUT_LABELS[a.statut] ?? a.statut}
                  </span>
                </li>
              );
            })}
          </ul>

          <AjouterArticleBenevoleForm />
        </>
      )}
    </main>
  );
}
