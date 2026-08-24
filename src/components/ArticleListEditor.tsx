"use client";

import { useState } from "react";
import { messageMotInterdit, motInterdit } from "@/lib/articles-interdits";

type ArticleRow = { nom: string; prix: string };

const MAX_ARTICLES = 30;

function lignesVides(n: number): ArticleRow[] {
  return Array.from({ length: n }, () => ({ nom: "", prix: "" }));
}

export function ArticleListEditor({
  fieldName = "articles",
  initialArticles,
}: {
  fieldName?: string;
  initialArticles?: { nom: string; prix: number }[];
}) {
  const [articles, setArticles] = useState<ArticleRow[]>(
    initialArticles && initialArticles.length > 0
      ? initialArticles.map((a) => ({ nom: a.nom, prix: String(a.prix) }))
      : lignesVides(MAX_ARTICLES),
  );

  function updateArticle(index: number, field: keyof ArticleRow, value: string) {
    setArticles((prev) =>
      prev.map((article, i) => (i === index ? { ...article, [field]: value } : article)),
    );
  }

  // On ne retire jamais la ligne elle-même (ça décale toutes les suivantes
  // et il n'y a plus moyen de la récupérer) — on vide juste son contenu.
  function viderArticle(index: number) {
    setArticles((prev) => prev.map((article, i) => (i === index ? { nom: "", prix: "" } : article)));
  }

  const articlesRemplis = articles.filter((a) => a.nom.trim().length > 0);
  const articlesJson = JSON.stringify(
    articlesRemplis.map((a) => ({ nom: a.nom, prix: Number(a.prix) || 0 })),
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Articles</h2>
        <span className="text-sm text-zinc-500">
          {articlesRemplis.length} / {MAX_ARTICLES}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {articles.map((article, i) => {
          const nomRempli = article.nom.trim().length > 0;
          const mot = nomRempli ? motInterdit(article.nom) : null;
          const prixInvalide = nomRempli && article.prix.trim() !== "" && Number(article.prix) <= 0;
          return (
            <div key={i}>
              <div className="flex items-center gap-2">
                <span className="w-6 shrink-0 text-sm text-zinc-400">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <input
                  value={article.nom}
                  onChange={(e) => updateArticle(i, "nom", e.target.value)}
                  placeholder="Nom de l'objet"
                  className={
                    mot
                      ? "flex-1 rounded-md border border-red-400 px-3 py-2"
                      : "flex-1 rounded-md border border-zinc-300 px-3 py-2"
                  }
                />
                <input
                  value={article.prix}
                  onChange={(e) => updateArticle(i, "prix", e.target.value)}
                  type="number"
                  min={1}
                  step={1}
                  placeholder="CHF"
                  className={
                    prixInvalide
                      ? "w-24 rounded-md border border-red-400 px-3 py-2"
                      : "w-24 rounded-md border border-zinc-300 px-3 py-2"
                  }
                />
                <button
                  type="button"
                  onClick={() => viderArticle(i)}
                  disabled={!article.nom && !article.prix}
                  className="shrink-0 rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-500 hover:border-red-400 hover:text-red-600 disabled:opacity-0"
                >
                  Vider
                </button>
              </div>
              {mot && <p className="ml-8 mt-1 text-sm text-red-600">{messageMotInterdit(mot)}</p>}
              {!mot && prixInvalide && (
                <p className="ml-8 mt-1 text-sm text-red-600">Indiquez un prix supérieur à 0.–.</p>
              )}
            </div>
          );
        })}
      </div>

      <input type="hidden" name={fieldName} value={articlesJson} />
    </div>
  );
}
