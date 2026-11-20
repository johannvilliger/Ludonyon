"use client";

import { useTransition } from "react";
import { accepterTousLesArticles } from "./actions";

export function ToutAccepterButton({ code }: { code: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          !window.confirm(
            "Accepter tous les articles de cette liste ? Un article déjà refusé repasserait aussi à accepté — ne touche jamais un article vendu ou invendu.",
          )
        )
          return;
        startTransition(() => accepterTousLesArticles(code));
      }}
      className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-50"
    >
      {pending ? "…" : "✓ Tout accepter"}
    </button>
  );
}
