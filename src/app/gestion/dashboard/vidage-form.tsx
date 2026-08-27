"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { enregistrerVidage, type VidageState } from "./actions";

const initialState: VidageState = { error: null };

// Si le réseau lâche pendant l'appel serveur, useActionState laisserait
// l'erreur remonter telle quelle (pas de filet ailleurs dans l'appli) — on
// la transforme ici en simple message, le formulaire garde ce qui a été
// saisi et rien n'est perdu.
async function enregistrerVidageResilient(prevState: VidageState, formData: FormData): Promise<VidageState> {
  try {
    return await enregistrerVidage(prevState, formData);
  } catch {
    return { error: "Connexion perdue — réessayez, rien n'a été enregistré." };
  }
}

export function VidageForm({ caisseId, nbArticlesVendus }: { caisseId: string; nbArticlesVendus: number }) {
  const [state, formAction, pending] = useActionState(enregistrerVidageResilient, initialState);
  // Champs contrôlés plutôt que laissés à l'action : React vide un
  // <form action={...}> après chaque tentative, réussie ou non — sans ça, le
  // montant saisi disparaîtrait même juste après une coupure réseau, ce
  // qu'on cherche justement à éviter.
  const [montant, setMontant] = useState("");
  const [effectuePar, setEffectuePar] = useState("");
  const enSoumission = useRef(false);

  useEffect(() => {
    if (pending) {
      enSoumission.current = true;
      return;
    }
    if (!enSoumission.current) return;
    enSoumission.current = false;
    if (state.error === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMontant("");
      setEffectuePar("");
    }
  }, [pending, state]);

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
        value={montant}
        onChange={(e) => setMontant(e.target.value)}
        className="w-24 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
      />
      <input
        name="effectue_par"
        placeholder="Par qui"
        required
        value={effectuePar}
        onChange={(e) => setEffectuePar(e.target.value)}
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
