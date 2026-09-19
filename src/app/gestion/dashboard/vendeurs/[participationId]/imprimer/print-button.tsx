"use client";

import { useTransition } from "react";
import { marquerListeImprimee } from "./actions";

export function PrintButton({ participationId }: { participationId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await marquerListeImprimee(participationId);
          window.print();
        })
      }
      className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
    >
      {pending ? "…" : "Imprimer"}
    </button>
  );
}
