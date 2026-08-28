"use client";

import { useTransition } from "react";
import { renvoyerQuittance } from "./actions";

export function RenvoyerQuittanceButton({ quittanceId }: { quittanceId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => renvoyerQuittance(quittanceId))}
      className="rounded border border-zinc-300 px-2 py-1 text-xs font-normal hover:border-zinc-400 disabled:opacity-50"
    >
      {pending ? "…" : "Envoyer maintenant"}
    </button>
  );
}
