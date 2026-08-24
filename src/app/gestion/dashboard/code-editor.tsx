"use client";

import { useState, useTransition } from "react";

export function CodeEditor({
  valeurInitiale,
  onSave,
  label,
}: {
  valeurInitiale: string;
  onSave: (valeur: string) => Promise<void>;
  label: string;
}) {
  const [valeur, setValeur] = useState(valeurInitiale);
  const [visible, setVisible] = useState(false);
  const [pending, startTransition] = useTransition();
  const [enregistre, setEnregistre] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <span className="w-24 shrink-0 text-sm text-zinc-600">{label}</span>
      <input
        type={visible ? "text" : "password"}
        value={valeur}
        onChange={(e) => {
          setValeur(e.target.value);
          setEnregistre(false);
        }}
        className="flex-1 rounded-md border border-zinc-300 px-2 py-1.5 font-mono text-sm"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Masquer le code" : "Afficher le code"}
        title={visible ? "Masquer le code" : "Afficher le code"}
        className="shrink-0 rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm hover:border-zinc-400"
      >
        {visible ? "🙈" : "👁"}
      </button>
      <button
        type="button"
        onClick={() =>
          startTransition(async () => {
            await onSave(valeur);
            setEnregistre(true);
          })
        }
        disabled={pending}
        className="w-24 shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:border-zinc-400 disabled:opacity-50"
      >
        {pending ? "…" : enregistre ? "✓ Fait" : "Enregistrer"}
      </button>
    </div>
  );
}
