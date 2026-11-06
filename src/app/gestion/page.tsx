"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { validerCode, type CodeState } from "./actions";

const initialState: CodeState = { error: null };

export default function GestionPage() {
  return (
    <Suspense>
      <GestionForm />
    </Suspense>
  );
}

function GestionForm() {
  const [state, formAction, pending] = useActionState(validerCode, initialState);
  const searchParams = useSearchParams();
  // Renvoyé par /gestion/acces/[code] (lien/QR magique) quand le code
  // qu'il contenait n'est plus valide — ex. révoqué après un vol.
  const erreurLien = searchParams.get("erreur");
  const erreur = state.error ?? erreurLien;

  return (
    <main className="mx-auto w-full flex max-w-sm flex-1 flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Accès gestion</h1>
      <p className="mt-2 text-sm text-zinc-600">Entrez votre code d&apos;accès (accueil, caisse ou dashboard).</p>

      <form action={formAction} className="mt-6 space-y-3">
        <input
          name="code"
          type="password"
          autoFocus
          placeholder="Code d'accès"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-center font-mono tracking-widest"
        />
        {erreur && <p className="text-sm text-red-600">{erreur}</p>}
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
