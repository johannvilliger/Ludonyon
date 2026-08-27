"use client";

import { useActionState } from "react";
import { enregistrerVidage, type VidageState } from "./actions";

const initialState: VidageState = { error: null };

export function VidageForm({ caisseId, nbArticlesVendus }: { caisseId: string; nbArticlesVendus: number }) {
  const [state, formAction, pending] = useActionState(enregistrerVidage, initialState);

  return (
    <form action={formAction} className="mt-2 flex flex-wrap items-center gap-2">
      <input type="hidden" name="caisse_id" value={caisseId} />
      <input
        name="montant"
        type="number"
        min={0.01}
        step="any"
        placeholder="Montant"
        required
        className="w-24 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
      />
      <input
        name="effectue_par"
        placeholder="Par qui"
        required
        className="w-32 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:border-zinc-400 disabled:opacity-50"
      >
        {pending ? "…" : "Vider"}
      </button>
      <span className="text-xs text-zinc-400">
        {nbArticlesVendus} art. vendu{nbArticlesVendus > 1 ? "s" : ""}
      </span>
      {state.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
