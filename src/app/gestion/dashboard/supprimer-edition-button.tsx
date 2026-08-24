"use client";

import { useTransition } from "react";
import { supprimerEdition } from "./actions";

export function SupprimerEditionButton({ editionId, annee }: { editionId: string; annee: number }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          !window.confirm(
            `Supprimer définitivement l'édition ${annee} ? Tout ce qui lui est rattaché (vendeurs de cette édition, articles, caisses, ventes...) sera effacé. Irréversible.`,
          )
        )
          return;
        startTransition(() => supprimerEdition(editionId));
      }}
      className="rounded border border-red-300 px-2 py-1 text-xs font-medium text-red-600 hover:border-red-400 hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? "…" : "Supprimer"}
    </button>
  );
}
