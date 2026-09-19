"use client";

import { useState, useTransition } from "react";

export function MessageEditor({
  valeurInitiale,
  onSave,
}: {
  valeurInitiale: string;
  onSave: (valeur: string) => Promise<void>;
}) {
  const [valeur, setValeur] = useState(valeurInitiale);
  const [pending, startTransition] = useTransition();
  const [enregistre, setEnregistre] = useState(false);

  return (
    <div>
      <textarea
        value={valeur}
        onChange={(e) => {
          setValeur(e.target.value);
          setEnregistre(false);
        }}
        rows={3}
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
      />
      <button
        type="button"
        onClick={() =>
          startTransition(async () => {
            await onSave(valeur);
            setEnregistre(true);
          })
        }
        disabled={pending}
        className="mt-2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:border-zinc-400 disabled:opacity-50"
      >
        {pending ? "…" : enregistre ? "✓ Fait" : "Enregistrer"}
      </button>
    </div>
  );
}
