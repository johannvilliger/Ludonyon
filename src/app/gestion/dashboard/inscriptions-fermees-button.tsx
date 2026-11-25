"use client";

import { useTransition } from "react";
import { basculerInscriptionsFermees } from "./actions";

export function InscriptionsFermeesButton({ fermees }: { fermees: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => basculerInscriptionsFermees(!fermees))}
        className={
          fermees
            ? "rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:border-red-400 disabled:opacity-50"
            : "rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:border-zinc-400 disabled:opacity-50"
        }
      >
        {pending ? "…" : fermees ? "🔒 Rouvrir les inscriptions" : "Fermer les inscriptions"}
      </button>
      <span className="text-xs text-zinc-500">
        {fermees
          ? "Plus personne ne peut déposer une nouvelle liste sur /vendeur/nouveau."
          : "Les nouvelles inscriptions restent ouvertes tant que le dépôt l'est (phase dépôt/réception)."}
      </span>
    </div>
  );
}
