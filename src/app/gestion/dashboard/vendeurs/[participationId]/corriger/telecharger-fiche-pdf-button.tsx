"use client";

import { useTransition } from "react";
import { telechargerPdfClotureVendeurs } from "@/app/gestion/dashboard/cloture-vente/actions";

function base64VersBlob(base64: string): Blob {
  const binaire = atob(base64);
  const octets = new Uint8Array(binaire.length);
  for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
  return new Blob([octets], { type: "application/pdf" });
}

// Réutilise le même générateur que le PDF détaillé de clôture, borné à ce
// seul vendeur (plage debut = fin = son numéro) — pas de document dédié à
// maintenir en plus.
export function TelechargerFichePdfButton({ editionId, numeroVendeur }: { editionId: string; numeroVendeur: number }) {
  const [pending, startTransition] = useTransition();

  function telecharger() {
    startTransition(async () => {
      try {
        const { base64, nomFichier } = await telechargerPdfClotureVendeurs(editionId, {
          debut: numeroVendeur,
          fin: numeroVendeur,
        });
        const url = URL.createObjectURL(base64VersBlob(base64));
        const a = document.createElement("a");
        a.href = url;
        a.download = nomFichier;
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        window.alert("Impossible de générer la fiche PDF — réessayez.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={telecharger}
      disabled={pending}
      className="shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:border-zinc-400 disabled:opacity-50"
    >
      {pending ? "Génération…" : "📄 Fiche PDF de ce vendeur"}
    </button>
  );
}
