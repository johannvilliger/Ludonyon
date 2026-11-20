"use client";

import { useState, useTransition } from "react";
import { envoyerEtiquetteManuellePourImpression } from "./actions";

export function EnvoyerImpressionButton({
  numeroVendeur,
  numeroArticle,
  position,
}: {
  numeroVendeur: number;
  numeroArticle: number;
  position: number;
}) {
  const [pending, startTransition] = useTransition();
  const [envoyee, setEnvoyee] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (
            !window.confirm(
              "Envoyer cette étiquette à l'impression centralisée ? Elle sera imprimée exactement sur la case choisie, sans rien imprimer ailleurs sur la feuille déjà en place dans l'imprimante.",
            )
          )
            return;
          setErreur(null);
          startTransition(async () => {
            const resultat = await envoyerEtiquetteManuellePourImpression(numeroVendeur, numeroArticle, position);
            if (resultat.error) {
              setErreur(resultat.error);
              return;
            }
            setEnvoyee(true);
          });
        }}
        className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:border-zinc-400 disabled:opacity-50"
      >
        {pending ? "Envoi…" : envoyee ? "✓ Envoyée" : "Envoyer à l'impression centralisée"}
      </button>
      {erreur && <p className="text-sm text-red-600">{erreur}</p>}
    </div>
  );
}
