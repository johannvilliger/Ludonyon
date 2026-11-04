"use client";

import { useTransition } from "react";
import { purgerEtiquettesArticlesEnAttente } from "./actions";

export function PurgerEtiquettesFileAttenteButton({ nb }: { nb: number }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          !window.confirm(
            `Retirer ${nb} feuille${nb > 1 ? "s" : ""} d'étiquettes de la file d'attente d'impression ? Les articles eux-mêmes ne sont pas touchés, seules ces feuilles ne seront pas imprimées.`,
          )
        )
          return;
        startTransition(() => purgerEtiquettesArticlesEnAttente());
      }}
      className="shrink-0 rounded-md border border-zinc-300 px-2.5 py-1 text-xs text-zinc-600 hover:border-red-400 hover:text-red-600 disabled:opacity-50"
    >
      {pending ? "…" : "Purger la file d'attente"}
    </button>
  );
}
