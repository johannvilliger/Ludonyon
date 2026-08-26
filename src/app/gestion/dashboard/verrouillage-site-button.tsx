"use client";

import { useTransition } from "react";

export function VerrouillageSiteButton({
  deverrouilleManuellement,
  editionActive,
  onToggle,
}: {
  deverrouilleManuellement: boolean;
  editionActive: boolean;
  onToggle: (deverrouille: boolean) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const siteOuvert = deverrouilleManuellement || editionActive;

  return (
    <div>
      <p className="text-sm font-medium">
        {siteOuvert ? "🔓 Site accessible au public" : "🔒 Site verrouillé — accès public bloqué"}
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        {editionActive
          ? "Une édition est active : le site est déverrouillé automatiquement, quel que soit ce bouton."
          : "Aucune édition active : verrouillé par défaut. Utilisez ce bouton pour tester/démontrer sans exposer le site au public."}
      </p>
      <button
        type="button"
        disabled={pending || editionActive}
        onClick={() => startTransition(() => onToggle(!deverrouilleManuellement))}
        className="mt-3 rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:border-zinc-400 disabled:opacity-50"
      >
        {pending ? "…" : deverrouilleManuellement ? "Verrouiller à nouveau" : "Déverrouiller"}
      </button>
    </div>
  );
}
