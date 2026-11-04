"use client";

import { useTransition } from "react";
import { relancerEtiquettesArticlesEchec } from "./actions";

export function RelancerEtiquettesEchecsButton({ nb }: { nb: number }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => relancerEtiquettesArticlesEchec())}
      className="font-medium text-red-600 underline decoration-dotted hover:text-red-700 disabled:opacity-50"
      title="Remettre ces feuilles en attente pour que print-agent les réimprime"
    >
      {pending ? "…" : `${nb} en échec`}
    </button>
  );
}
