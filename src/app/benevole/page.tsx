"use client";

import { useActionState } from "react";
import { connexionBenevole, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export default function BenevoleLoginPage() {
  const [state, formAction, pending] = useActionState(connexionBenevole, initialState);

  return (
    <main className="mx-auto w-full flex max-w-sm flex-1 flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Connexion bénévole</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Connectez-vous avec votre numéro et votre mot de passe pour voir et gérer votre liste
        d&apos;articles.
      </p>

      <form action={formAction} className="mt-6 space-y-3">
        <input
          name="numero"
          type="number"
          autoFocus
          placeholder="Numéro"
          className="w-full rounded-md border border-zinc-300 px-3 py-2"
        />
        <input
          name="mot_de_passe"
          type="password"
          placeholder="Mot de passe"
          className="w-full rounded-md border border-zinc-300 px-3 py-2"
        />
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-zinc-900 px-4 py-3 font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {pending ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </main>
  );
}
