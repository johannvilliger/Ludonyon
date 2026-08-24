"use client";

import { useTransition } from "react";
import type { Phase } from "./actions";

export function PhaseButton({
  phase,
  label,
  active,
  onChange,
  avertissement,
}: {
  phase: Phase;
  label: string;
  active: boolean;
  onChange: (phase: Phase) => Promise<void>;
  avertissement?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={active || pending}
      onClick={() => {
        const message = avertissement
          ? `Passer l'édition en phase « ${label} » ?\n\n⚠️ ${avertissement}`
          : `Passer l'édition en phase « ${label} » ?`;
        if (!window.confirm(message)) return;
        startTransition(() => onChange(phase));
      }}
      className={
        active
          ? "rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white"
          : "rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:border-zinc-400 disabled:opacity-50"
      }
    >
      {pending ? "…" : label}
    </button>
  );
}
