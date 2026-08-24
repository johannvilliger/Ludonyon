"use client";

import { useActionState } from "react";
import { creerCaisse, type FormState } from "./actions";

const initialState: FormState = { error: null };

export function NouvelleCaisseForm() {
  const [state, formAction, pending] = useActionState(creerCaisse, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <div className="flex gap-2">
        <input
          name="nom"
          placeholder="Nom de la caisse (ex. Caisse 3)"
          required
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {pending ? "Création…" : "Ouvrir"}
        </button>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
