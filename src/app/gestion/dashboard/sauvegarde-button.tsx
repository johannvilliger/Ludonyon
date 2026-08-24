"use client";

import { useState, useTransition } from "react";
import { telechargerSauvegarde } from "./actions";

function nomFichier(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `sauvegarde-troc-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}h${pad(d.getMinutes())}.sql`;
}

export function SauvegardeButton() {
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  function telecharger() {
    setErreur(null);
    startTransition(async () => {
      try {
        const sql = await telechargerSauvegarde();
        const blob = new Blob([sql], { type: "application/sql" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = nomFichier();
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        setErreur(err instanceof Error ? err.message : "Impossible de générer la sauvegarde.");
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={telecharger}
        disabled={pending}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:border-zinc-400 disabled:opacity-50"
      >
        {pending ? "Génération…" : "Télécharger une sauvegarde"}
      </button>
      {erreur && <p className="mt-2 text-sm text-red-600">{erreur}</p>}
    </div>
  );
}
