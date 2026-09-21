"use client";

import { useMemo, useState } from "react";
import { PrintButton } from "./print-button";

// Planche Herma 4357 (voir globals.css) : 4 colonnes x 10 lignes, 40
// étiquettes par feuille. Au-delà, on enchaîne plusieurs .label-sheet, une
// par feuille physique, chacune avec sa propre marge (voir
// .label-sheet--nouvelle-page dans globals.css) — indispensable dès qu'on
// dépasse une feuille, ce qui n'arrivait jamais avant 901/902 (plafond de
// 30 articles pour un vendeur normal).
const COLONNES = 4;
const NB_ETIQUETTES = 40;

type Article = { numeroArticle: number; nom: string; prix: number; svg: string; dejaImprimee: boolean };

export function GenerateurEtiquettes({
  numeroVendeur,
  articles,
  special,
}: {
  numeroVendeur: number;
  articles: Article[];
  special: boolean;
}) {
  const premierNonImprime = articles.find((a) => !a.dejaImprimee)?.numeroArticle ?? articles[0].numeroArticle;
  const dernier = articles[articles.length - 1].numeroArticle;

  const [debut, setDebut] = useState(String(premierNonImprime));
  const [fin, setFin] = useState(String(dernier));
  const [position, setPosition] = useState<number | null>(null);

  const selection = useMemo(() => {
    const d = Number(debut);
    const f = Number(fin);
    if (!Number.isFinite(d) || !Number.isFinite(f) || d > f) return [];
    return articles.filter((a) => a.numeroArticle >= d && a.numeroArticle <= f);
  }, [articles, debut, fin]);

  // Feuille 1 : NB_ETIQUETTES - position vraies étiquettes, à partir de la
  // position choisie (pour ne pas gâcher les cases déjà utilisées d'une
  // feuille entamée). Feuilles suivantes : toujours pleines, à partir de la
  // position 0 (feuilles neuves).
  const feuilles = useMemo(() => {
    if (position === null || selection.length === 0) return [];
    const resultat: (Article | null)[][] = [];
    let reste = selection;

    const premiere: (Article | null)[] = Array(NB_ETIQUETTES).fill(null);
    const nbPremiere = Math.min(NB_ETIQUETTES - position, reste.length);
    for (let i = 0; i < nbPremiere; i++) premiere[position + i] = reste[i];
    resultat.push(premiere);
    reste = reste.slice(nbPremiere);

    while (reste.length > 0) {
      const feuille: (Article | null)[] = Array(NB_ETIQUETTES).fill(null);
      const nb = Math.min(NB_ETIQUETTES, reste.length);
      for (let i = 0; i < nb; i++) feuille[i] = reste[i];
      resultat.push(feuille);
      reste = reste.slice(nb);
    }
    return resultat;
  }, [selection, position]);

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 print:hidden">
        <div>
          <label className="block text-sm font-medium text-zinc-700" htmlFor="etiquettes-debut">
            Du n° article
          </label>
          <input
            id="etiquettes-debut"
            type="text"
            inputMode="numeric"
            value={debut}
            onChange={(e) => {
              setDebut(e.target.value);
              setPosition(null);
            }}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700" htmlFor="etiquettes-fin">
            Au n° article
          </label>
          <input
            id="etiquettes-fin"
            type="text"
            inputMode="numeric"
            value={fin}
            onChange={(e) => {
              setFin(e.target.value);
              setPosition(null);
            }}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
          />
        </div>
        <div className="flex items-end">
          <p className="text-sm text-zinc-600">
            {selection.length} étiquette{selection.length > 1 ? "s" : ""} sélectionnée
            {selection.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {selection.length === 0 && (
        <p className="mt-3 text-sm text-red-600 print:hidden">Aucun article dans cette plage.</p>
      )}

      {selection.length > 0 && position === null && (
        <>
          <p className="mt-4 text-sm text-zinc-600 print:hidden">
            Cliquez sur la première case encore vierge de votre feuille physique.
          </p>
          <div className="label-sheet mt-4">
            {Array.from({ length: NB_ETIQUETTES }, (_, i) => (
              <div
                key={i}
                onClick={() => setPosition(i)}
                className="label cursor-pointer print:invisible"
                title={`Ligne ${Math.floor(i / COLONNES) + 1}, colonne ${(i % COLONNES) + 1}`}
              >
                <span className="label__hint">{i + 1}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {selection.length > 0 && position !== null && (
        <>
          <div className="mt-4 flex items-center justify-between print:hidden">
            <button
              type="button"
              onClick={() => setPosition(null)}
              className="text-sm text-zinc-500 hover:underline"
            >
              ← Changer la position de départ
            </button>
            <PrintButton numerosArticle={selection.map((a) => a.numeroArticle)} />
          </div>

          {feuilles.map((feuille, indexFeuille) => (
            <div
              key={indexFeuille}
              className={`label-sheet mt-4${indexFeuille > 0 ? " label-sheet--nouvelle-page" : ""}`}
            >
              {feuille.map((article, i) =>
                article ? (
                  <div key={i} className="label">
                    <div className="label__row">
                      <span className={special ? "label__vendor label__vendor--special" : "label__vendor"}>
                        {numeroVendeur}
                      </span>
                      <span className="label__item">{String(article.numeroArticle).padStart(2, "0")}</span>
                    </div>
                    <div className="label__price">{article.prix}.–</div>
                    <div className="label__row label__row--bottom">
                      <img src="/meeple.png" alt="" className="label__logo--inline" />
                      <div className="qr-wrap" dangerouslySetInnerHTML={{ __html: article.svg }} />
                    </div>
                  </div>
                ) : (
                  <div key={i} className="label print:invisible" />
                ),
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
