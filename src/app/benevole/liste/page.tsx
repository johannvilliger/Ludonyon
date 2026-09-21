import { redirect } from "next/navigation";
import Link from "next/link";
import { query, queryOne } from "@/lib/db";
import { benevoleConnecte } from "@/lib/benevole-session";
import { statutEtiquetteArticle } from "@/lib/etiquette-article-statut";
import { deconnexionBenevole } from "../actions";
import { ArticlesVerrouilles } from "./articles-verrouilles";
import { BenevoleArticlesEditor } from "./benevole-articles-editor";

export const dynamic = "force-dynamic";

type Article = {
  id: string;
  numero_article: number;
  nom: string;
  prix: number;
  statut: string;
  etiquette_nom_imprime: string | null;
  etiquette_prix_imprime: number | null;
  etiquette_imprimee_le: string | null;
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
        `SELECT id, numero_article, nom, prix, statut, etiquette_nom_imprime, etiquette_prix_imprime, etiquette_imprimee_le
         FROM articles WHERE participation_id = ? ORDER BY numero_article`,
        [participation.id],
      )
    : [];
  const total = articles.reduce((sum, a) => sum + a.prix, 0);
  // Une fois réceptionné (ou vendu/invendu/refusé), seul le staff corrige
  // encore quelque chose, depuis l'accueil — seuls les articles "non_recu"
  // passent dans l'éditeur en masse ci-dessous.
  const articlesVerrouilles = articles.filter((a) => a.statut !== "non_recu");
  const articlesModifiables = articles.filter((a) => a.statut === "non_recu");

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
          <div className="mt-8 flex items-center justify-between">
            <h2 className="text-lg font-medium">
              {articles.length} article{articles.length > 1 ? "s" : ""} · {total} CHF
            </h2>
            {articles.length > 0 && (
              <Link
                href="/benevole/etiquettes"
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:border-zinc-400"
              >
                Imprimer mes étiquettes →
              </Link>
            )}
          </div>

          {articlesVerrouilles.length > 0 && <ArticlesVerrouilles articles={articlesVerrouilles} />}

          <BenevoleArticlesEditor
            initialArticles={articlesModifiables.map((a) => ({ nom: a.nom, prix: a.prix }))}
            statutsEtiquetteParNom={Object.fromEntries(
              articlesModifiables.map((a) => [a.nom.trim().toLowerCase(), statutEtiquetteArticle(a)]),
            )}
            numeroDepart={articlesVerrouilles.length + 1}
            numeroVendeur={session.numeroFixe}
          />
        </>
      )}
    </main>
  );
}
