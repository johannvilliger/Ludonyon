"use client";

import { useTransition } from "react";
import { cloturerCaisse } from "./actions";

export function ClotureButton({ caisseId, posteId }: { caisseId: string; posteId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          !window.confirm(
            "Clôturer définitivement cette caisse pour cette édition ? Vous ne pourrez plus vous y reconnecter ensuite.",
          )
        )
          return;
        startTransition(() => cloturerCaisse(caisseId, posteId));
      }}
      className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:border-red-400 hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? "…" : "Clôturer ma caisse"}
    </button>
  );
}
