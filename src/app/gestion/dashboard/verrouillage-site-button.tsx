"use client";

import { useTransition } from "react";
import type { ModeVerrouillage } from "./actions";

const OPTIONS: { valeur: ModeVerrouillage; label: string }[] = [
  { valeur: "auto", label: "Automatique" },
  { valeur: "deverrouille", label: "Forcer déverrouillé" },
  { valeur: "verrouille", label: "Forcer verrouillé" },
];

export function VerrouillageSiteButton({
  mode,
  editionActive,
  onToggle,
}: {
  mode: ModeVerrouillage;
  editionActive: boolean;
  onToggle: (mode: ModeVerrouillage) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const siteOuvert = mode === "verrouille" ? false : mode === "deverrouille" ? true : editionActive;

  return (
    <div>
      <p className="text-sm font-medium">
        {siteOuvert ? "🔓 Site accessible au public" : "🔒 Site verrouillé — accès public bloqué"}
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        {mode === "auto" &&
          (editionActive
            ? "Automatique : déverrouillé car une édition est active."
            : "Automatique : verrouillé par défaut, aucune édition active.")}
        {mode === "deverrouille" && "Forcé déverrouillé manuellement, quelle que soit l'édition."}
        {mode === "verrouille" && "Forcé verrouillé manuellement, même avec une édition active."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.valeur}
            type="button"
            disabled={pending || mode === o.valeur}
            onClick={() => startTransition(() => onToggle(o.valeur))}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
              mode === o.valeur
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-300 hover:border-zinc-400"
            }`}
          >
            {pending ? "…" : o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
