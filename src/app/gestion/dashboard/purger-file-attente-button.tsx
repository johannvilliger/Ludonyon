"use client";

import { useTransition } from "react";
import { purgerTicketsEnAttente } from "./actions";

export function PurgerFileAttenteButton({ nb }: { nb: number }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          !window.confirm(
            `Retirer ${nb} ticket${nb > 1 ? "s" : ""} de la file d'attente d'impression ? Les ventes elles-mêmes ne sont pas touchées, seuls ces tickets ne seront pas imprimés.`,
          )
        )
          return;
        startTransition(() => purgerTicketsEnAttente());
      }}
      className="shrink-0 rounded-md border border-zinc-300 px-2.5 py-1 text-xs text-zinc-600 hover:border-red-400 hover:text-red-600 disabled:opacity-50"
    >
      {pending ? "…" : "Purger la file d'attente"}
    </button>
  );
}
