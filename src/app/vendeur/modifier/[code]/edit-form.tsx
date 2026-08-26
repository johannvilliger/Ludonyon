"use client";

import { useActionState, useState } from "react";
import { ArticleListEditor } from "@/components/ArticleListEditor";
import { modifierListeVendeur, type FormState } from "./actions";

const initialState: FormState = { error: null };

export function EditForm({
  code,
  initialArticles,
}: {
  code: string;
  initialArticles: { nom: string; prix: number }[];
}) {
  const action = modifierListeVendeur.bind(null, code);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [articlesValides, setArticlesValides] = useState(true);

  return (
    <form action={formAction} className="mt-8 space-y-6">
      <ArticleListEditor initialArticles={initialArticles} onValiditeChange={setArticlesValides} />

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-green-700">Liste mise à jour.</p>}

      <button
        type="submit"
        disabled={pending || !articlesValides}
        className="rounded-md bg-zinc-900 px-6 py-3 font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {pending ? "Enregistrement…" : "Enregistrer les modifications"}
      </button>
    </form>
  );
}
