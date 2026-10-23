"use client";

import { useState, useTransition } from "react";
import { messageMotInterdit, motInterdit } from "@/lib/articles-interdits";
import { LONGUEUR_MAX_NOM } from "@/lib/validation-articles";
import { modifierArticle, supprimerArticle } from "./actions";

export function ArticleEditableRow({
  articleId,
  code,
  nomInitial,
  prixInitial,
}: {
  articleId: string;
  code: string;
  nomInitial: string;
  prixInitial: number;
}) {
  const [nom, setNom] = useState(nomInitial);
  const [prix, setPrix] = useState(String(prixInitial));
  const [enregistre, setEnregistre] = useState(true);
  const [pending, startTransition] = useTransition();
  const [supprimePending, startSupprimer] = useTransition();
  const [supprime, setSupprime] = useState(false);

  const mot = nom.trim() ? motInterdit(nom) : null;
  const tropLong = nom.trim().length > LONGUEUR_MAX_NOM;
  const prixInvalide = nom.trim() !== "" && (prix.trim() === "" || Number(prix) <= 0);

  if (supprime) {
    return <p className="flex-1 self-center text-sm text-zinc-400 line-through">{nomInitial}</p>;
  }

  return (
    <div className="flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={nom}
          onChange={(e) => {
            setNom(e.target.value);
            setEnregistre(false);
          }}
          className={
            mot || tropLong
              ? "min-w-0 flex-1 rounded border border-red-400 px-2 py-1 text-sm"
              : "min-w-0 flex-1 rounded border border-zinc-300 px-2 py-1 text-sm"
          }
        />
        <input
          type="number"
          min={1}
          step={1}
          value={prix}
          onChange={(e) => {
            setPrix(e.target.value);
            setEnregistre(false);
          }}
          className={
            prixInvalide
              ? "w-20 shrink-0 rounded border border-red-400 px-2 py-1 text-sm"
              : "w-20 shrink-0 rounded border border-zinc-300 px-2 py-1 text-sm"
          }
        />
        <button
          type="button"
          disabled={pending || Boolean(mot) || tropLong || prixInvalide || enregistre}
          onClick={() =>
            startTransition(async () => {
              await modifierArticle(articleId, code, nom, Number(prix));
              setEnregistre(true);
            })
          }
          className="shrink-0 rounded border border-zinc-300 px-2 py-1 text-xs hover:border-zinc-400 disabled:opacity-50"
        >
          {pending ? "…" : enregistre ? "✓" : "Enregistrer"}
        </button>
        <button
          type="button"
          disabled={supprimePending}
          onClick={() => {
            if (!window.confirm(`Supprimer l'article « ${nom || nomInitial} » ? Irréversible.`)) return;
            startSupprimer(async () => {
              await supprimerArticle(articleId, code);
              setSupprime(true);
            });
          }}
          className="shrink-0 rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:border-red-400 hover:bg-red-50 disabled:opacity-50"
        >
          {supprimePending ? "…" : "Supprimer"}
        </button>
      </div>
      {mot && <p className="mt-1 text-xs text-red-600">{messageMotInterdit(mot)}</p>}
      {!mot && tropLong && (
        <p className="mt-1 text-xs text-red-600">
          Le nom dépasse {LONGUEUR_MAX_NOM} caractères ({nom.trim().length}/{LONGUEUR_MAX_NOM}).
        </p>
      )}
      {!mot && !tropLong && prixInvalide && (
        <p className="mt-1 text-xs text-red-600">Indiquez un prix supérieur à 0.–.</p>
      )}
    </div>
  );
}
