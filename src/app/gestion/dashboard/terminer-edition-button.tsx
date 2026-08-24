"use client";

import { useTransition } from "react";
import { terminerEdition } from "./actions";

export function TerminerEditionButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          !window.confirm(
            "Terminer définitivement cette édition ? Elle ne sera plus active — impossible de revenir en " +
              "arrière depuis cette interface, mais tu pourras ensuite lancer une nouvelle édition.",
          )
        )
          return;
        startTransition(() => terminerEdition());
      }}
      className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:border-red-400 hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? "…" : "Terminer l'édition"}
    </button>
  );
}
