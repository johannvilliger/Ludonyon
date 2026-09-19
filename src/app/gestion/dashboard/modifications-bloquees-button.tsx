"use client";

import { useTransition } from "react";
import { basculerModificationsBloquees } from "./actions";

export function ModificationsBloqueesButton({ bloquees }: { bloquees: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => basculerModificationsBloquees(!bloquees))}
        className={
          bloquees
            ? "rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:border-red-400 disabled:opacity-50"
            : "rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:border-zinc-400 disabled:opacity-50"
        }
      >
        {pending ? "…" : bloquees ? "🔒 Débloquer les modifications" : "Bloquer les modifications"}
      </button>
      <span className="text-xs text-zinc-500">
        {bloquees
          ? "Les vendeurs ne peuvent plus modifier leur liste (les nouvelles soumissions restent possibles)."
          : "Un vendeur peut encore modifier sa liste tant que le dépôt est ouvert."}
      </span>
    </div>
  );
}
