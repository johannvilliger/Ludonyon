"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { classerArticlesEdition } from "./actions";

export function ClasserButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  function classer() {
    setMessage(null);
    setErreur(null);
    startTransition(async () => {
      try {
        const { classes, autre } = await classerArticlesEdition();
        setMessage(
          classes === 0
            ? "Aucun article à classer (tout est déjà catégorisé)."
            : `${classes} article${classes > 1 ? "s" : ""} classé${classes > 1 ? "s" : ""}, dont ${autre} en « Autre ».`,
        );
        router.refresh();
      } catch (err) {
        setErreur(err instanceof Error ? err.message : "Impossible de classer les articles.");
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={classer}
        disabled={pending}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:border-zinc-400 disabled:opacity-50"
      >
        {pending ? "Classement en cours…" : "Classer les articles automatiquement"}
      </button>
      {message && <p className="mt-2 text-sm text-emerald-700">{message}</p>}
      {erreur && <p className="mt-2 text-sm text-red-600">{erreur}</p>}
    </div>
  );
}
