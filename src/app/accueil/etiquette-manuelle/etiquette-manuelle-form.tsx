"use client";

import { useState, useTransition } from "react";
import { rechercherArticlePourEtiquette, type ArticleEtiquette } from "./actions";
import { PrintButton } from "./print-button";

// Planche Herma 4357 (voir globals.css) : 4 colonnes x 10 lignes, 40
// étiquettes par feuille.
const COLONNES = 4;
const NB_ETIQUETTES = 40;

export function EtiquetteManuelleForm() {
  const [numeroVendeur, setNumeroVendeur] = useState("");
  const [numeroArticle, setNumeroArticle] = useState("");
  const [article, setArticle] = useState<ArticleEtiquette | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [position, setPosition] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  function rechercher() {
    setErreur(null);
    setArticle(null);
    setPosition(null);
    startTransition(async () => {
      const resultat = await rechercherArticlePourEtiquette(Number(numeroVendeur), Number(numeroArticle));
      if (!resultat.ok) {
        setErreur(resultat.error);
        return;
      }
      setArticle(resultat.article);
    });
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 print:hidden">
        <div>
          <label className="block text-sm font-medium text-zinc-700" htmlFor="etiquette-numero-vendeur">
            N° vendeur
          </label>
          <input
            id="etiquette-numero-vendeur"
            type="text"
            inputMode="numeric"
            placeholder="ex. 77"
            value={numeroVendeur}
            onChange={(e) => setNumeroVendeur(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700" htmlFor="etiquette-numero-article">
            N° article
          </label>
          <input
            id="etiquette-numero-article"
            type="text"
            inputMode="numeric"
            placeholder="ex. 01"
            value={numeroArticle}
            onChange={(e) => setNumeroArticle(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
          />
        </div>
        <div className="flex items-end">
          <button
            type="button"
            disabled={pending || !numeroVendeur.trim() || !numeroArticle.trim()}
            onClick={rechercher}
            className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {pending ? "…" : "Rechercher"}
          </button>
        </div>
      </div>

      {erreur && <p className="mt-3 text-sm text-red-600 print:hidden">{erreur}</p>}

      {article && (
        <>
          <div className="mt-6 flex items-center justify-between print:hidden">
            <p className="text-sm text-zinc-600">
              « {article.nom} » — {article.prix}.– · Cliquez sur la case encore vierge sur la feuille physique, puis
              imprimez.
            </p>
            {position !== null && <PrintButton />}
          </div>

          <div className="label-sheet mt-4">
            {Array.from({ length: NB_ETIQUETTES }, (_, i) => {
              const selectionnee = position === i;
              return (
                <div
                  key={i}
                  onClick={() => setPosition(i)}
                  className={`label ${selectionnee ? "" : "cursor-pointer print:invisible"}`}
                  title={selectionnee ? undefined : `Ligne ${Math.floor(i / COLONNES) + 1}, colonne ${(i % COLONNES) + 1}`}
                >
                  {selectionnee ? (
                    <>
                      <div className="label__row">
                        <span className="label__vendor">{numeroVendeur}</span>
                        <span className="label__item">{String(article.numeroArticle).padStart(2, "0")}</span>
                      </div>
                      <div className="label__price">{article.prix}.–</div>
                      <div className="label__row label__row--bottom">
                        <img src="/meeple.png" alt="" className="label__logo--inline" />
                        <div className="qr-wrap" dangerouslySetInnerHTML={{ __html: article.svg }} />
                      </div>
                    </>
                  ) : (
                    <span className="label__hint">{i + 1}</span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
