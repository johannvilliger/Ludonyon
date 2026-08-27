"use client";

import { useState, useTransition } from "react";
import { supprimerBenevole } from "./actions";

export function SupprimerBenevoleButton({ benevoleId, nom }: { benevoleId: string; nom: string }) {
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`Supprimer « ${nom} » ? Possible uniquement s'il n'a encore rien vendu.`)) return;
          setErreur(null);
          startTransition(async () => {
            const resultat = await supprimerBenevole(benevoleId);
            if (resultat.error) setErreur(resultat.error);
          });
        }}
        className="rounded border border-red-300 px-2 py-1 text-xs font-medium text-red-600 hover:border-red-400 hover:bg-red-50 disabled:opacity-50"
      >
        {pending ? "…" : "Supprimer"}
      </button>
      {erreur && <span className="text-xs text-red-600">{erreur}</span>}
    </span>
  );
}
