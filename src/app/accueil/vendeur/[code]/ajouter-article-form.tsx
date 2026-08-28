"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { messageMotInterdit, motInterdit } from "@/lib/articles-interdits";
import { ajouterArticle } from "./actions";

export function AjouterArticleForm({ code }: { code: string }) {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [prix, setPrix] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const mot = nom.trim() ? motInterdit(nom) : null;
  const prixInvalide = nom.trim() !== "" && prix.trim() !== "" && Number(prix) <= 0;

  function ajouter() {
    setErreur(null);
    if (!nom.trim() || !prix.trim() || mot || prixInvalide) return;
    startTransition(async () => {
      try {
        await ajouterArticle(code, nom, Number(prix));
        setNom("");
        setPrix("");
        router.refresh();
      } catch (err) {
        setErreur(err instanceof Error ? err.message : "Impossible d'ajouter l'article.");
      }
    });
  }

  return (
    <div className="mt-4 rounded-md border border-zinc-200 p-4">
      <p className="text-sm font-medium text-zinc-700">
        Ajouter un article oublié (pas de plafond, même si la liste est déjà à 30)
      </p>
      <div className="mt-2 flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Nom de l'objet"
            className={mot ? "w-full rounded-md border border-red-400 px-3 py-2" : "w-full rounded-md border border-zinc-300 px-3 py-2"}
          />
          {mot && <p className="mt-1 text-xs text-red-600">{messageMotInterdit(mot)}</p>}
        </div>
        <div className="w-28 shrink-0">
          <input
            type="number"
            min={1}
            step={1}
            value={prix}
            onChange={(e) => setPrix(e.target.value)}
            placeholder="CHF"
            className={prixInvalide ? "w-full rounded-md border border-red-400 px-3 py-2" : "w-full rounded-md border border-zinc-300 px-3 py-2"}
          />
          {prixInvalide && <p className="mt-1 text-xs text-red-600">Prix &gt; 0.–</p>}
        </div>
        <button
          type="button"
          onClick={ajouter}
          disabled={pending || !nom.trim() || !prix.trim() || Boolean(mot) || prixInvalide}
          className="shrink-0 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {pending ? "…" : "Ajouter"}
        </button>
      </div>
      {erreur && <p className="mt-2 text-sm text-red-600">{erreur}</p>}
    </div>
  );
}
