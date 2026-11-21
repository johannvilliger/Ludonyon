"use client";

import { useState, useTransition } from "react";
import { envoyerEtiquettesClotureImpression, envoyerPdfClotureImpression } from "./actions";

export function ImprimerPlageForm({ editionId }: { editionId: string }) {
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");
  const [pending, startTransition] = useTransition();
  const [resultat, setResultat] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const debutNum = Number(debut);
  const finNum = Number(fin);
  const plageValide =
    debut.trim() !== "" && fin.trim() !== "" && Number.isInteger(debutNum) && Number.isInteger(finNum) && finNum >= debutNum;

  function envoyer(action: (editionId: string, plage: { debut: number; fin: number }) => Promise<void>, label: string) {
    if (!plageValide) return;
    setResultat(null);
    setErreur(null);
    startTransition(async () => {
      try {
        await action(editionId, { debut: debutNum, fin: finNum });
        setResultat(`✓ ${label} — envoyé à l'impression pour les vendeurs ${debutNum} à ${finNum}.`);
      } catch (err) {
        setErreur(err instanceof Error ? err.message : "Échec de l'envoi — réessayez.");
      }
    });
  }

  return (
    <div className="mt-6 rounded-md border border-zinc-200 p-4 print:hidden">
      <h2 className="text-sm font-medium text-zinc-700">
        Réimprimer seulement une plage de vendeurs (sans refaire tout le monde)
      </h2>
      <p className="mt-1 text-xs text-zinc-500">
        Utile par exemple pour sortir juste les n° 901/902 (Ludothèque, Dons Ludothèque) sans relancer les
        ~200 autres feuilles déjà imprimées.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-sm text-zinc-600">De n°</span>
        <input
          type="number"
          value={debut}
          onChange={(e) => setDebut(e.target.value)}
          className="w-20 rounded border border-zinc-300 px-2 py-1 text-sm"
        />
        <span className="text-sm text-zinc-600">à n°</span>
        <input
          type="number"
          value={fin}
          onChange={(e) => setFin(e.target.value)}
          className="w-20 rounded border border-zinc-300 px-2 py-1 text-sm"
        />
        <button
          type="button"
          disabled={pending || !plageValide}
          onClick={() => envoyer(envoyerEtiquettesClotureImpression, "Étiquettes")}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:border-zinc-400 disabled:opacity-50"
        >
          {pending ? "Envoi…" : "🖨 Étiquettes de cette plage"}
        </button>
        <button
          type="button"
          disabled={pending || !plageValide}
          onClick={() => envoyer(envoyerPdfClotureImpression, "PDF détaillé")}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:border-zinc-400 disabled:opacity-50"
        >
          {pending ? "Envoi…" : "🖨 PDF détaillé de cette plage"}
        </button>
      </div>
      {resultat && <p className="mt-2 text-xs text-emerald-700">{resultat}</p>}
      {erreur && <p className="mt-2 text-xs text-red-600">{erreur}</p>}
    </div>
  );
}
