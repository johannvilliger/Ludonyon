"use client";

import { useActionState, useRef } from "react";
import { creerBenevole, type FormState } from "./actions";

const initialState: FormState = { error: null };

export function BenevoleForm() {
  const [state, formAction, pending] = useActionState(creerBenevole, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        formAction(formData);
        formRef.current?.reset();
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <label className="block">
        <span className="text-sm font-medium text-zinc-700">Numéro</span>
        <input
          name="numero"
          type="number"
          min={903}
          step={1}
          required
          placeholder="903+"
          className="mt-1 w-24 rounded-md border border-zinc-300 px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-zinc-700">Nom</span>
        <input name="nom" required className="mt-1 w-56 rounded-md border border-zinc-300 px-3 py-2" />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {pending ? "Création…" : "Ajouter un bénévole"}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
