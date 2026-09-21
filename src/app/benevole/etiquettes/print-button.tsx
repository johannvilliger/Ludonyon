"use client";

import { useTransition } from "react";
import { marquerEtiquettesImprimees } from "./actions";

export function PrintButton({ numerosArticle }: { numerosArticle: number[] }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending || numerosArticle.length === 0}
      onClick={() =>
        startTransition(async () => {
          await marquerEtiquettesImprimees(numerosArticle);
          window.print();
        })
      }
      className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
    >
      {pending ? "…" : "Imprimer"}
    </button>
  );
}
