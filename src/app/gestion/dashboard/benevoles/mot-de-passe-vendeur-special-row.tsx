"use client";

import { useActionState, useState } from "react";
import { modifierMotDePasseVendeurSpecial, type FormState } from "./actions";

const initialState: FormState = { error: null };

export function MotDePasseVendeurSpecialRow({ benevoleId }: { benevoleId: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [state, formAction, pending] = useActionState(
    modifierMotDePasseVendeurSpecial.bind(null, benevoleId),
    initialState,
  );

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="rounded border border-zinc-300 px-2 py-1 text-xs font-normal hover:border-zinc-400"
      >
        Mot de passe
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input
        name="mot_de_passe"
        placeholder="Nouveau mot de passe"
        minLength={4}
        required
        className="w-40 rounded-md border border-zinc-300 px-2 py-1 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {pending ? "…" : "Enregistrer"}
      </button>
      <button
        type="button"
        onClick={() => setOuvert(false)}
        className="rounded border border-zinc-300 px-2 py-1 text-xs hover:border-zinc-400"
      >
        Annuler
      </button>
      {state.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
