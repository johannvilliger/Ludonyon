import { notFound } from "next/navigation";
import Link from "next/link";
import { query, queryOne } from "@/lib/db";
import { AjouterArticleForm } from "./ajouter-article-form";
import { ArticleEditableRow } from "./article-editable-row";
import { CoordonneesEditor } from "./coordonnees-editor";
import { accepterArticle, definirBenevole, marquerControlee, refuserArticle, terminerReception } from "./actions";

type Article = { id: string; numero_article: number; nom: string; prix: number; statut: string };
type Participation = {
  numero_vendeur: number;
  code_confirmation: string;
  statut: string;
  est_benevole: number;
  nom_vendeur: string;
  telephone: string | null;
  email: string | null;
};

const STATUT_LABELS: Record<string, string> = {
  liste_soumise: "Liste soumise",
  controlee: "Contrôlée",
  validee: "Liste validée",
  cloturee: "Clôturée",
};

const STATUT_ARTICLE_LABELS: Record<string, string> = {
  non_recu: "Non reçu",
  recu: "Reçu",
  vendu: "Vendu",
  invendu: "Invendu",
  refuse: "Refusé",
};

const STATUT_ARTICLE_STYLES: Record<string, string> = {
  non_recu: "bg-zinc-100 text-zinc-600",
  recu: "bg-emerald-100 text-emerald-800",
  vendu: "bg-blue-100 text-blue-800",
  invendu: "bg-amber-100 text-amber-800",
  refuse: "bg-red-100 text-red-800",
};

export default async function VendeurAccueilPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const participation = await queryOne<Participation>(
    `SELECT p.numero_vendeur, p.code_confirmation, p.statut, p.est_benevole,
            v.nom AS nom_vendeur, v.telephone, v.email
     FROM participations p
     JOIN vendeurs v ON v.id = p.vendeur_id
     WHERE p.code_confirmation = ?`,
    [code],
  );

  if (!participation) notFound();

  const articles = await query<Article>(
    `SELECT a.id, a.numero_article, a.nom, a.prix, a.statut
     FROM articles a
     JOIN participations p ON p.id = a.participation_id
     WHERE p.code_confirmation = ?
     ORDER BY a.numero_article`,
    [code],
  );

  const total = articles.reduce((sum, a) => sum + a.prix, 0);
  const receptionTerminee = articles.length > 0 && !articles.some((a) => a.statut === "non_recu");

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <Link href="/accueil" className="text-sm text-zinc-500 hover:underline">
        ← Recherche
      </Link>

      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {participation.nom_vendeur} — n° {participation.numero_vendeur}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {participation.telephone || "—"} · {participation.email || "—"}
          </p>
          <div className="mt-1">
            <CoordonneesEditor
              code={code}
              nomInitial={participation.nom_vendeur}
              telephoneInitial={participation.telephone}
              emailInitial={participation.email}
            />
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
          {STATUT_LABELS[participation.statut] ?? participation.statut}
        </span>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {participation.numero_vendeur >= 900 && (
          <form action={definirBenevole.bind(null, code, !participation.est_benevole)}>
            <button
              type="submit"
              className={
                participation.est_benevole
                  ? "rounded-md bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-200"
                  : "rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:border-zinc-400"
              }
            >
              {participation.est_benevole ? "✓ Vendeur bénévole" : "Marquer comme bénévole"}
            </button>
          </form>
        )}

        <Link
          href={`/accueil/vendeur/${code}/etiquettes`}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:border-zinc-400"
        >
          Imprimer les étiquettes
        </Link>

        {participation.statut !== "controlee" && (
          <form action={marquerControlee.bind(null, code)}>
            <button
              type="submit"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Marquer comme contrôlée
            </button>
          </form>
        )}

        {receptionTerminee && participation.statut !== "validee" && (
          <form action={terminerReception.bind(null, code)}>
            <button
              type="submit"
              className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
            >
              Terminer
            </button>
          </form>
        )}
      </div>

      <h2 className="mt-8 text-lg font-medium">
        {articles.length} article{articles.length > 1 ? "s" : ""} · {total} CHF
      </h2>
      <ul className="mt-3 divide-y divide-zinc-200">
        {articles.map((a) => {
          const modifiable = a.statut === "non_recu" || a.statut === "recu" || a.statut === "refuse";
          return (
            <li key={a.id} className="flex items-stretch gap-3 py-2 text-sm">
              <span className="w-6 shrink-0 self-center text-zinc-400">
                {String(a.numero_article).padStart(2, "0")}
              </span>
              {modifiable ? (
                <>
                  <ArticleEditableRow articleId={a.id} code={code} nomInitial={a.nom} prixInitial={a.prix} />
                  <div className="w-px shrink-0 self-stretch bg-zinc-200" />
                  <div className="flex shrink-0 items-center gap-2">
                    <form action={accepterArticle.bind(null, a.id, code)}>
                      <button
                        type="submit"
                        className={
                          a.statut === "recu"
                            ? "rounded-md bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800"
                            : "rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium hover:border-emerald-400 hover:text-emerald-700"
                        }
                      >
                        {a.statut === "recu" ? "✓ Accepté" : "Accepter"}
                      </button>
                    </form>
                    <form action={refuserArticle.bind(null, a.id, code)}>
                      <button
                        type="submit"
                        className={
                          a.statut === "refuse"
                            ? "rounded-md bg-red-100 px-3 py-1 text-xs font-medium text-red-800"
                            : "rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium hover:border-red-400 hover:text-red-700"
                        }
                      >
                        {a.statut === "refuse" ? "✓ Refusé" : "Refuser"}
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <>
                  <span className="flex-1 self-center">
                    {a.nom} <span className="font-mono text-zinc-500">{a.prix}.–</span>
                  </span>
                  <span
                    className={`shrink-0 self-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUT_ARTICLE_STYLES[a.statut] ?? "bg-zinc-100 text-zinc-600"}`}
                  >
                    {STATUT_ARTICLE_LABELS[a.statut] ?? a.statut}
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ul>

      <AjouterArticleForm code={code} />
    </main>
  );
}
