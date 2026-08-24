"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArticleListEditor } from "@/components/ArticleListEditor";
import { creerListeAccueil, type FormState } from "./actions";

const initialState: FormState = { error: null };

export default function NouvelleListeAccueilPage() {
  const [state, formAction, pending] = useActionState(creerListeAccueil, initialState);
  const [articlesValides, setArticlesValides] = useState(true);

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <Link href="/accueil" className="text-sm text-zinc-500 hover:underline">
        ← Accueil
      </Link>

      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Nouvelle liste sur place</h1>
      <p className="mt-2 text-zinc-600">
        Pour un vendeur qui n&apos;a pas soumis sa liste en ligne au préalable.
      </p>

      <form action={formAction} className="mt-8 space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="grid flex-1 gap-4 sm:grid-cols-2">
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
                type="tel"
                required
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

          <button
            type="submit"
            disabled={pending || !articlesValides}
            className="shrink-0 rounded-md bg-zinc-900 px-6 py-3 font-medium text-white hover:bg-zinc-800 disabled:opacity-50 sm:w-auto"
          >
            {pending ? "Enregistrement…" : "Créer la liste"}
          </button>
        </div>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
          <input name="est_benevole" type="checkbox" className="h-4 w-4 rounded border-zinc-300" />
          Vendeur bénévole (pas de retenue de 10% sur ses ventes)
        </label>

        <ArticleListEditor onValiditeChange={setArticlesValides} />
      </form>
    </main>
  );
}
