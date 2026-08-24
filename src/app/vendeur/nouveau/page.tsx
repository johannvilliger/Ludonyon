"use client";

import { useActionState } from "react";
import { ArticleListEditor } from "@/components/ArticleListEditor";
import { soumettreListe, type FormState } from "./actions";

const initialState: FormState = { error: null };

export default function NouvelleListePage() {
  const [state, formAction, pending] = useActionState(soumettreListe, initialState);

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Déposer ma liste</h1>
        <a
          href="/reglement.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:border-zinc-400"
        >
          Règlement (PDF)
        </a>
      </div>
      <p className="mt-2 text-zinc-600">
        Un objet par ligne, avec son prix en francs (pas de centimes). Vous recevrez un numéro de
        vendeur et un code à présenter au dépôt.
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
            disabled={pending}
            className="shrink-0 rounded-md bg-zinc-900 px-6 py-3 font-medium text-white hover:bg-zinc-800 disabled:opacity-50 sm:w-auto"
          >
            {pending ? "Envoi…" : "Soumettre ma liste"}
          </button>
        </div>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <ArticleListEditor />
      </form>
    </main>
  );
}
