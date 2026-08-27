"use client";

import { useState, useTransition } from "react";
import { exporterExcelBilan } from "./actions";

function base64VersBlob(base64: string): Blob {
  const binaire = atob(base64);
  const octets = new Uint8Array(binaire.length);
  for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
  return new Blob([octets], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export function ExportExcelButton({ editionId }: { editionId: string }) {
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  function telecharger() {
    setErreur(null);
    startTransition(async () => {
      try {
        const { base64, nomFichier } = await exporterExcelBilan(editionId);
        const url = URL.createObjectURL(base64VersBlob(base64));
        const a = document.createElement("a");
        a.href = url;
        a.download = nomFichier;
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        setErreur("Impossible de générer le fichier — réessayez.");
      }
    });
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={telecharger}
        disabled={pending}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:border-zinc-400 disabled:opacity-50"
      >
        {pending ? "Génération…" : "Export Excel"}
      </button>
      {erreur && <span className="text-xs text-red-600">{erreur}</span>}
    </div>
  );
}
