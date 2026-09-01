"use client";

import { useState, useTransition } from "react";
import type { Phase } from "./actions";

export function PhaseButton({
  phase,
  label,
  active,
  onChange,
  avertissement,
  bloque,
}: {
  phase: Phase;
  label: string;
  active: boolean;
  onChange: (phase: Phase) => Promise<void>;
  avertissement?: string;
  bloque?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={active || pending}
        onClick={() => {
          if (bloque) {
            window.alert(bloque);
            return;
          }
          const message = avertissement
            ? `Passer l'édition en phase « ${label} » ?\n\n⚠️ ${avertissement}`
            : `Passer l'édition en phase « ${label} » ?`;
          if (!window.confirm(message)) return;
          setErreur(null);
          startTransition(async () => {
            try {
              await onChange(phase);
            } catch (err) {
              setErreur(err instanceof Error ? err.message : "Impossible de changer de phase.");
            }
          });
        }}
        className={
          active
            ? "rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white"
            : "rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:border-zinc-400 disabled:opacity-50"
        }
      >
        {pending ? "…" : label}
      </button>
      {erreur && <p className="mt-1 text-xs text-red-600">{erreur}</p>}
    </div>
  );
}
