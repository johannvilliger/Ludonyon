"use client";

import { useState, useTransition } from "react";
import { marquerMessageTraite } from "./actions";

export function TraiteToggle({ messageId, traite }: { messageId: string; traite: boolean }) {
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setErreur(null);
          startTransition(async () => {
            const resultat = await marquerMessageTraite(messageId, !traite);
            if (resultat.error) setErreur(resultat.error);
          });
        }}
        className={
          traite
            ? "rounded border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-600 hover:border-zinc-400"
            : "rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:border-emerald-400"
        }
      >
        {pending ? "…" : traite ? "Marquer non traité" : "Marquer traité"}
      </button>
      {erreur && <span className="text-xs text-red-600">{erreur}</span>}
    </span>
  );
}
