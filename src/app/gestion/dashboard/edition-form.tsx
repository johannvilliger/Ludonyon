"use client";

import { useActionState } from "react";
import { creerEdition, type FormState } from "./actions";

const initialState: FormState = { error: null };

export function EditionForm() {
  const [state, formAction, pending] = useActionState(creerEdition, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <label className="block">
        <span className="text-sm font-medium text-zinc-700">Année</span>
        <input
          name="annee"
          type="number"
          defaultValue={new Date().getFullYear()}
          className="mt-1 w-28 rounded-md border border-zinc-300 px-3 py-2"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {pending ? "Création…" : "Lancer une nouvelle édition"}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
