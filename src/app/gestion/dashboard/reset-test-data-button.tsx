"use client";

import { useTransition } from "react";
import { reinitialiserDonneesTest } from "./actions";

export function ResetTestDataButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          !window.confirm(
            "Ceci efface TOUS les vendeurs, articles et ventes de l'édition active, remet les caisses à zéro, " +
              "puis recrée 10 vendeurs de test avec 10 articles chacun. Irréversible. Continuer ?",
          )
        )
          return;
        startTransition(() => reinitialiserDonneesTest());
      }}
      className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:border-red-400 hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? "Réinitialisation…" : "Réinitialiser avec les données de test"}
    </button>
  );
}
