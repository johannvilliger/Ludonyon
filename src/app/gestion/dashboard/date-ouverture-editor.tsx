"use client";

import { useState, useTransition } from "react";

// L'input datetime-local travaille en heure locale du navigateur sans fuseau
// ("2026-09-15T10:30"), ce qui correspond à ce qu'on stocke tel quel côté
// serveur (voir modifierDateOuverture) — pas de conversion UTC nécessaire
// pour un événement local à heure fixe.
function versValeurInput(datetimeMysql: string | null): string {
  if (!datetimeMysql) return "";
  return datetimeMysql.replace(" ", "T").slice(0, 16);
}

export function DateOuvertureEditor({
  valeurInitiale,
  onSave,
}: {
  valeurInitiale: string | null;
  onSave: (valeur: string) => Promise<void>;
}) {
  const [valeur, setValeur] = useState(versValeurInput(valeurInitiale));
  const [pending, startTransition] = useTransition();
  const [enregistre, setEnregistre] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <span className="w-40 shrink-0 text-sm text-zinc-600">Date d&apos;ouverture</span>
      <input
        type="datetime-local"
        value={valeur}
        onChange={(e) => {
          setValeur(e.target.value);
          setEnregistre(false);
        }}
        className="flex-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
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
        className="w-24 shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:border-zinc-400 disabled:opacity-50"
      >
        {pending ? "…" : enregistre ? "✓ Fait" : "Enregistrer"}
      </button>
    </div>
  );
}
