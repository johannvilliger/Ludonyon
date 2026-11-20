"use client";

import { useTransition } from "react";
import { marquerAbsent, marquerTousAbsents } from "./actions";

export function MarquerAbsentButton({ participationId, absent }: { participationId: string; absent: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => marquerAbsent(participationId, absent))}
      className={
        absent
          ? "rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:border-red-400 hover:text-red-700 disabled:opacity-50"
          : "rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-50"
      }
    >
      {pending ? "…" : absent ? "Marquer absent" : "↩ Marquer revenu"}
    </button>
  );
}

export function MarquerTousAbsentsButton({ nb }: { nb: number }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          !window.confirm(
            `Marquer les ${nb} vendeur${nb > 1 ? "s" : ""} en attente comme absent${nb > 1 ? "s" : ""} ? Leurs listes et articles restent en base, juste sortis des statistiques.`,
          )
        )
          return;
        startTransition(() => {
          void marquerTousAbsents();
        });
      }}
      className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
    >
      {pending ? "…" : `Tout marquer absent (${nb})`}
    </button>
  );
}
