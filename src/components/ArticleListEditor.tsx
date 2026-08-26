"use client";

import { useEffect, useState } from "react";
import { messageMotInterdit, motInterdit } from "@/lib/articles-interdits";

type ArticleRow = { nom: string; prix: string };

const MAX_ARTICLES = 30;

function lignesVides(n: number): ArticleRow[] {
  return Array.from({ length: n }, () => ({ nom: "", prix: "" }));
}

// Prix entier obligatoire (pas de centimes) : la virgule et le point sont
// tous deux refusés, quel que soit ce que le navigateur laisse taper dans
// le champ number selon la locale.
function contientCentimes(prix: string): boolean {
  return prix.includes(".") || prix.includes(",");
}

function prixEstInvalide(prix: string): boolean {
  if (prix.trim() === "") return false;
  if (contientCentimes(prix)) return true;
  const n = Number(prix);
  return !Number.isInteger(n) || n <= 0;
}

export function ArticleListEditor({
  fieldName = "articles",
  initialArticles,
  onValiditeChange,
}: {
  fieldName?: string;
  initialArticles?: { nom: string; prix: number }[];
  onValiditeChange?: (valide: boolean) => void;
}) {
  // Complète toujours jusqu'à MAX_ARTICLES lignes vides après les articles
  // déjà présents : sur le formulaire de modification, initialArticles ne
  // contient que les articles existants — sans ce complément, impossible
  // d'ajouter un nouvel article, seulement de modifier ceux déjà là.
  const [articles, setArticles] = useState<ArticleRow[]>(() => {
    const remplies = (initialArticles ?? []).map((a) => ({ nom: a.nom, prix: String(a.prix) }));
    return [...remplies, ...lignesVides(Math.max(0, MAX_ARTICLES - remplies.length))];
  });

  useEffect(() => {
    const invalide = articles.some((a) => a.nom.trim().length > 0 && (motInterdit(a.nom) || prixEstInvalide(a.prix)));
    onValiditeChange?.(!invalide);
  }, [articles, onValiditeChange]);

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
          const prixInvalide = nomRempli && prixEstInvalide(article.prix);
          const centimes = prixInvalide && contientCentimes(article.prix);
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
                <p className="ml-8 mt-1 text-sm text-red-600">
                  {centimes
                    ? "Pas de centimes : indiquez un prix en francs entiers (ex. 12, pas 12.50)."
                    : "Indiquez un prix supérieur à 0.–."}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <input type="hidden" name={fieldName} value={articlesJson} />
    </div>
  );
}
