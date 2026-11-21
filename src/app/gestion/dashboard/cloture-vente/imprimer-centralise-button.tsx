"use client";

import { useState, useTransition } from "react";

export function ImprimerCentraliseButton({
  action,
  label,
}: {
  action: () => Promise<void>;
  label: string;
}) {
  const [pending, startTransition] = useTransition();
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setErreur(null);
          setEnvoye(false);
          startTransition(async () => {
            try {
              await action();
              setEnvoye(true);
            } catch (err) {
              setErreur(err instanceof Error ? err.message : "Échec de l'envoi — réessayez.");
            }
          });
        }}
        className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:border-zinc-400 disabled:opacity-50"
      >
        {pending ? "Envoi…" : label}
      </button>
      {envoye && <span className="text-xs text-emerald-700">✓ Envoyé à l&apos;impression</span>}
      {erreur && <span className="text-xs text-red-600">{erreur}</span>}
    </div>
  );
}
