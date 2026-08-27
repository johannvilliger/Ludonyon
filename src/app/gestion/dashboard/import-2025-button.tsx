"use client";

import { useTransition } from "react";
import { importerEdition2025 } from "./actions";

export function Import2025Button() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          !window.confirm(
            "Ceci crée une édition 2025 (déjà terminée) avec les 156 vendeurs du cahier papier, pour la " +
              "démo/le test. Ne peut être fait qu'une seule fois. Continuer ?",
          )
        )
          return;
        startTransition(() => importerEdition2025());
      }}
      className="rounded-md border border-blue-300 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50"
    >
      {pending ? "Import…" : "Importer l'édition 2025 (démo)"}
    </button>
  );
}
