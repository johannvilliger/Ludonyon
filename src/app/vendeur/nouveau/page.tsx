"use client";

import { useActionState, useState } from "react";
import { soumettreListe, type FormState } from "./actions";

type ArticleRow = { nom: string; prix: string };

const MAX_ARTICLES = 30;
const initialState: FormState = { error: null };

export default function NouvelleListePage() {
  const [articles, setArticles] = useState<ArticleRow[]>([{ nom: "", prix: "" }]);
  const [state, formAction, pending] = useActionState(soumettreListe, initialState);

  function updateArticle(index: number, field: keyof ArticleRow, value: string) {
    setArticles((prev) =>
      prev.map((article, i) => (i === index ? { ...article, [field]: value } : article)),
    );
  }

  function addArticle() {
    setArticles((prev) => (prev.length >= MAX_ARTICLES ? prev : [...prev, { nom: "", prix: "" }]));
  }

  function removeArticle(index: number) {
    setArticles((prev) => prev.filter((_, i) => i !== index));
  }

  const articlesJson = JSON.stringify(
    articles.map((a) => ({ nom: a.nom, prix: Number(a.prix) || 0 })),
  );

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Déposer ma liste</h1>
      <p className="mt-2 text-zinc-600">
        Un objet par ligne, avec son prix en francs (pas de centimes). Tu recevras un numéro de
        vendeur et un code à présenter au dépôt.
      </p>

      <form action={formAction} className="mt-8 space-y-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">Nom</span>
            <input
              name="nom"
              required
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">Téléphone</span>
            <input
              name="telephone"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-zinc-700">Email</span>
            <input
              name="email"
              type="email"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Articles</h2>
            <span className="text-sm text-zinc-500">
              {articles.length} / {MAX_ARTICLES}
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {articles.map((article, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 shrink-0 text-sm text-zinc-400">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <input
                  value={article.nom}
                  onChange={(e) => updateArticle(i, "nom", e.target.value)}
                  placeholder="Nom de l'objet"
                  className="flex-1 rounded-md border border-zinc-300 px-3 py-2"
                />
                <input
                  value={article.prix}
                  onChange={(e) => updateArticle(i, "prix", e.target.value)}
                  type="number"
                  min={0}
                  step={1}
                  placeholder="CHF"
                  className="w-24 rounded-md border border-zinc-300 px-3 py-2"
                />
                <button
                  type="button"
                  onClick={() => removeArticle(i)}
                  aria-label="Supprimer cet article"
                  className="px-2 text-lg text-zinc-400 hover:text-red-600"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addArticle}
            disabled={articles.length >= MAX_ARTICLES}
            className="mt-3 w-full rounded-md border border-dashed border-zinc-300 px-3 py-2 text-sm text-zinc-600 hover:border-zinc-400 disabled:opacity-40"
          >
            + Ajouter un article
          </button>
        </div>

        <input type="hidden" name="articles" value={articlesJson} />

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-zinc-900 px-4 py-3 font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {pending ? "Envoi…" : "Soumettre ma liste"}
        </button>
      </form>
    </main>
  );
}
