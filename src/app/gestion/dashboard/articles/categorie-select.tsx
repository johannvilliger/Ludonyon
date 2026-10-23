"use client";

import { useState, useTransition } from "react";
import { CATEGORIES_ARTICLES } from "@/lib/categories";
import { changerCategorieArticle } from "./actions";

export function CategorieSelect({ articleId, categorie }: { articleId: string; categorie: string | null }) {
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  return (
    <span className="inline-flex items-center gap-1">
      <select
        value={categorie ?? ""}
        disabled={pending}
        onChange={(e) => {
          setErreur(null);
          const nomCategorie = e.target.value;
          startTransition(async () => {
            const resultat = await changerCategorieArticle(articleId, nomCategorie);
            if (resultat.error) setErreur(resultat.error);
          });
        }}
        className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-xs text-zinc-600 disabled:opacity-50"
      >
        <option value="">Sans catégorie</option>
        {CATEGORIES_ARTICLES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      {erreur && <span className="text-xs text-red-600">{erreur}</span>}
    </span>
  );
}
