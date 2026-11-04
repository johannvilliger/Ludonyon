"use client";

import { useState, useTransition } from "react";
import type { CaseEtiquette } from "@/lib/etiquettes-articles-impression";
import { envoyerEtiquettesImpression } from "./actions";

// Dépose la feuille (déjà composée par le parent — copies "plusieurs" et
// étiquettes "texte seul" déjà développées) dans la file d'attente
// print-agent, plutôt que de passer par l'aperçu/impression du navigateur.
// Reste un geste volontaire (clic + confirmation), pas un envoi automatique
// à chaque changement : une feuille d'étiquettes se joue sur une planche
// adhésive à positions fixes, pas du papier qu'on réimprime sans y penser
// (voir la discussion sur les risques d'une impression à distance pour ce
// cas précis).
export function EnvoyerImpressionButton({
  code,
  numeroVendeur,
  nomVendeur,
  telephone,
  special,
  cases,
}: {
  code: string;
  numeroVendeur: number;
  nomVendeur: string;
  telephone: string | null;
  special: boolean;
  cases: CaseEtiquette[];
}) {
  const [pending, startTransition] = useTransition();
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  function envoyer() {
    if (
      !window.confirm(
        `Envoyer ${cases.length} étiquette${cases.length > 1 ? "s" : ""} à l'impression centralisée (accueil) ?`,
      )
    )
      return;
    setErreur(null);
    startTransition(async () => {
      try {
        await envoyerEtiquettesImpression(code, { numeroVendeur, nomVendeur, telephone, special, cases });
        setEnvoye(true);
      } catch (err) {
        setErreur(err instanceof Error ? err.message : "Échec de l'envoi.");
      }
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending || cases.length === 0}
        onClick={envoyer}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:border-zinc-400 disabled:opacity-50"
      >
        {pending ? "Envoi…" : envoye ? "Envoyé ✓ (renvoyer)" : "Envoyer à l'impression centralisée"}
      </button>
      {erreur && <span className="text-xs text-red-600">{erreur}</span>}
    </span>
  );
}
