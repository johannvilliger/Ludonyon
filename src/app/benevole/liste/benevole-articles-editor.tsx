"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArticleListEditor } from "@/components/ArticleListEditor";
import { enregistrerArticlesBenevole } from "./actions";

export function BenevoleArticlesEditor({
  initialArticles,
}: {
  initialArticles: { nom: string; prix: number }[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [articlesValides, setArticlesValides] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function enregistrer() {
    setErreur(null);
    const formData = new FormData(formRef.current!);
    let articles: { nom: string; prix: number }[] = [];
    try {
      articles = JSON.parse(String(formData.get("articles") ?? "[]"));
    } catch {
      setErreur("Liste d'articles invalide.");
      return;
    }
    startTransition(async () => {
      try {
        await enregistrerArticlesBenevole(articles);
        router.refresh();
      } catch (err) {
        setErreur(err instanceof Error ? err.message : "Impossible d'enregistrer.");
      }
    });
  }

  return (
    <form
      ref={formRef}
      className="mt-8"
      onSubmit={(e) => {
        e.preventDefault();
        enregistrer();
      }}
    >
      <ArticleListEditor initialArticles={initialArticles} onValiditeChange={setArticlesValides} illimite />
      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || !articlesValides}
          className="rounded-md bg-zinc-900 px-6 py-3 font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        {erreur && <p className="text-sm text-red-600">{erreur}</p>}
      </div>
    </form>
  );
}
