"use client";

import { useState, useTransition } from "react";
import { cloturerCaisseVide } from "./actions";

export function ClotureCaisseVideButton({ caisseId, numero }: { caisseId: string; numero: number }) {
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  return (
    <div className="mt-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`Clôturer la caisse ${numero} à zéro (elle n'a servi à aucune vente ni vidage) ?`)) {
            return;
          }
          setErreur(null);
          startTransition(async () => {
            try {
              await cloturerCaisseVide(caisseId);
            } catch (err) {
              setErreur(err instanceof Error ? err.message : "Impossible de clôturer cette caisse.");
            }
          });
        }}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:border-zinc-400 disabled:opacity-50"
      >
        {pending ? "…" : "Clôturer (à zéro)"}
      </button>
      {erreur && <p className="mt-1 text-xs text-red-600">{erreur}</p>}
    </div>
  );
}
