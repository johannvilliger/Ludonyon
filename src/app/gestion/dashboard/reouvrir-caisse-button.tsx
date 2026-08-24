"use client";

import { useTransition } from "react";
import { rouvrirCaisse } from "./actions";

export function ReouvrirCaisseButton({ caisseId, numero }: { caisseId: string; numero: number }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          !window.confirm(
            `Rouvrir la caisse ${numero} ? Les ventes déjà encaissées restent inchangées — la caissière devra se reconnecter avec son code.`,
          )
        )
          return;
        startTransition(() => rouvrirCaisse(caisseId));
      }}
      className="rounded border border-amber-300 px-2 py-1 text-xs font-medium text-amber-700 hover:border-amber-400 hover:bg-amber-50 disabled:opacity-50"
    >
      {pending ? "…" : "Rouvrir"}
    </button>
  );
}
