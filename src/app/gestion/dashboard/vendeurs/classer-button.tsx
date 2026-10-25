"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { classerArticlesEdition, reclasserTousLesArticlesEdition, type ResultatClassement } from "./actions";

function ClassementButton({
  action,
  label,
  labelEnCours,
  confirmation,
  className,
}: {
  action: () => Promise<ResultatClassement>;
  label: string;
  labelEnCours: string;
  confirmation?: string;
  className: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  function lancer() {
    if (confirmation && !window.confirm(confirmation)) return;
    setMessage(null);
    setErreur(null);
    startTransition(async () => {
      try {
        const { classes, autre } = await action();
        setMessage(
          classes === 0
            ? "Aucun article à classer."
            : `${classes} article${classes > 1 ? "s" : ""} classé${classes > 1 ? "s" : ""}, dont ${autre} en « Autre ».`,
        );
        router.refresh();
      } catch (err) {
        setErreur(err instanceof Error ? err.message : "Impossible de classer les articles.");
      }
    });
  }

  return (
    <div>
      <button type="button" onClick={lancer} disabled={pending} className={className}>
        {pending ? labelEnCours : label}
      </button>
      {message && <p className="mt-2 text-sm text-emerald-700">{message}</p>}
      {erreur && <p className="mt-2 text-sm text-red-600">{erreur}</p>}
    </div>
  );
}

export function ClasserButton() {
  return (
    <ClassementButton
      action={classerArticlesEdition}
      label="Classer les articles automatiquement"
      labelEnCours="Classement en cours…"
      className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:border-zinc-400 disabled:opacity-50"
    />
  );
}

// Écrase aussi les catégories déjà posées (automatiquement ou à la main) —
// pensé pour un usage ponctuel (ex. juste après un changement de la liste
// des catégories), pas en routine, d'où la confirmation et le style plus
// discret que le bouton normal.
export function ReclasserButton() {
  return (
    <ClassementButton
      action={reclasserTousLesArticlesEdition}
      label="Reclasser tous les articles (écrase les catégories existantes)"
      labelEnCours="Reclassement en cours…"
      confirmation="Reclasser TOUS les articles de cette édition ? Ça va écraser les catégories déjà posées, y compris les corrections manuelles. Irréversible."
      className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:border-amber-400 disabled:opacity-50"
    />
  );
}
