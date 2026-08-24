"use client";

import { useActionState } from "react";
import { validerCode, type CodeState } from "./actions";

const initialState: CodeState = { error: null };

export default function GestionPage() {
  const [state, formAction, pending] = useActionState(validerCode, initialState);

  return (
    <main className="mx-auto flex max-w-sm flex-1 flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Accès gestion</h1>
      <p className="mt-2 text-sm text-zinc-600">Entre ton code d&apos;accès (caisse ou dashboard).</p>

      <form action={formAction} className="mt-6 space-y-3">
        <input
          name="code"
          type="password"
          autoFocus
          placeholder="Code d'accès"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-center font-mono tracking-widest"
        />
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-zinc-900 px-4 py-3 font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {pending ? "Vérification…" : "Valider"}
        </button>
      </form>
    </main>
  );
}
