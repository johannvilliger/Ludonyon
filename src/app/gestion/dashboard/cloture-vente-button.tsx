"use client";

import { useTransition } from "react";
import { lancerClotureVente } from "./actions";

export function ClotureVenteButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          !window.confirm(
            "Lancer la clôture de la vente ? Tous les articles restants (non vendus) seront marqués « invendu » " +
              "pour cette édition, puis les étiquettes enveloppe par vendeur s'afficheront.",
          )
        )
          return;
        startTransition(() => lancerClotureVente());
      }}
      className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
    >
      {pending ? "…" : "Lancer la clôture"}
    </button>
  );
}
