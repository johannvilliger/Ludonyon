"use client";

import { useEffect, useState } from "react";
import { EtiquetteArticleNom, nomTropLongPourEtiquetteNormale } from "@/components/EtiquetteArticleNom";
import { EtiquetteTexteSeul } from "@/components/EtiquetteTexteSeul";
import { PrintButton } from "./print-button";

// Planche Herma 4357 (voir globals.css) : 40 étiquettes/feuille. Au-delà,
// on enchaîne plusieurs .label-sheet (voir label-sheet--nouvelle-page) —
// devient possible dès qu'on duplique des étiquettes ou qu'on ajoute des
// étiquettes "texte seul", un vendeur normal (≤30 articles) ne dépassait
// jamais une feuille avant ça.
const NB_ETIQUETTES = 40;

type Label = { numero_article: number; nom: string; prix: number; svg: string };
type Options = { plusieurs: boolean; quantite: number; nomEntier: boolean };
type Slot = { cle: string; type: "normal" | "texte"; article: Label };

function optionsParDefaut(): Options {
  return { plusieurs: false, quantite: 1, nomEntier: false };
}

export function EtiquettesVendeur({
  numeroVendeur,
  nomVendeur,
  telephone,
  special,
  labels,
}: {
  numeroVendeur: number;
  nomVendeur: string;
  telephone: string | null;
  special: boolean;
  labels: Label[];
}) {
  const [options, setOptions] = useState<Record<number, Options>>({});
  const [nomsLongs, setNomsLongs] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Détection côté client (Canvas, voir nomTropLongPourEtiquetteNormale) —
    // juste un indicateur pour le bénévole, aucun impact sur l'impression
    // tant que la case "Nom en entier" n'est pas cochée.
    const longs = new Set<number>();
    for (const l of labels) {
      if (nomTropLongPourEtiquetteNormale(l.nom)) longs.add(l.numero_article);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNomsLongs(longs);
  }, [labels]);

  function maj(numeroArticle: number, patch: Partial<Options>) {
    setOptions((prev) => ({
      ...prev,
      [numeroArticle]: { ...(prev[numeroArticle] ?? optionsParDefaut()), ...patch },
    }));
  }

  const slots: Slot[] = [];
  for (const l of labels) {
    const opt = options[l.numero_article] ?? optionsParDefaut();
    const quantite = opt.plusieurs ? Math.min(20, Math.max(1, opt.quantite)) : 1;
    for (let i = 0; i < quantite; i++) {
      slots.push({ cle: `${l.numero_article}-n${i}`, type: "normal", article: l });
    }
    if (opt.nomEntier) {
      slots.push({ cle: `${l.numero_article}-t`, type: "texte", article: l });
    }
  }

  // 1re feuille : la case 0 est prise par l'étiquette coordonnées, donc
  // NB_ETIQUETTES - 1 cases pour les articles. Feuilles suivantes : pleines.
  const feuilles: Slot[][] = [];
  let reste = slots;
  feuilles.push(reste.slice(0, NB_ETIQUETTES - 1));
  reste = reste.slice(NB_ETIQUETTES - 1);
  while (reste.length > 0) {
    feuilles.push(reste.slice(0, NB_ETIQUETTES));
    reste = reste.slice(NB_ETIQUETTES);
  }

  const copiesSupplementaires = slots.filter((s) => s.type === "normal").length - labels.length;
  const etiquettesTexteSeul = slots.filter((s) => s.type === "texte").length;

  function renderSlot(slot: Slot) {
    const l = slot.article;
    if (slot.type === "texte") {
      return (
        <div key={slot.cle} className="label label--texte-seul">
          {/* eslint-disable-next-line @next/next/no-img-element -- logo local, pas une ressource à optimiser */}
          <img src="/meeple.png" alt="" className="label__logo--texte-seul" />
          <EtiquetteTexteSeul nom={l.nom} />
        </div>
      );
    }
    return (
      <div key={slot.cle} className="label">
        <div className="label__row">
          <div className="label__vendor-group">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo local, pas une ressource à optimiser */}
            <img src="/meeple.png" alt="" className="label__logo--inline" />
            <span className={special ? "label__vendor label__vendor--special" : "label__vendor"}>
              {numeroVendeur}
            </span>
          </div>
          <span className="label__item">art. {String(l.numero_article).padStart(2, "0")}</span>
        </div>
        <div className="label__price">{l.prix}.–</div>
        <div className="label__row label__row--bottom">
          <EtiquetteArticleNom nom={l.nom} />
          {/* le SVG est produit par la librairie `qrcode` côté serveur à partir
              d'une chaîne qu'on construit nous-mêmes, pas de contenu utilisateur brut */}
          <div className="qr-wrap" dangerouslySetInnerHTML={{ __html: l.svg }} />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-semibold tracking-tight">
          {labels.length} étiquette{labels.length > 1 ? "s" : ""}
        </h1>
        <PrintButton />
      </div>

      <p className="mb-3 text-sm text-zinc-500 print:hidden">
        Par défaut, 1 étiquette normale par article. Cochez « Plusieurs » pour en dupliquer, ou
        « Nom en entier » pour ajouter une étiquette texte seul (logo + nom complet) — utile si le
        nom dépasse ce qui tient sur l&apos;étiquette normale.
      </p>

      <table className="mb-8 w-full text-sm print:hidden">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-zinc-500">
            <th className="w-10 py-2 font-medium">N°</th>
            <th className="py-2 font-medium">Article</th>
            <th className="py-2 font-medium">Options d&apos;impression</th>
          </tr>
        </thead>
        <tbody>
          {labels.map((l) => {
            const opt = options[l.numero_article] ?? optionsParDefaut();
            return (
              <tr key={l.numero_article} className="border-b border-zinc-100">
                <td className="py-2 font-mono text-zinc-400">{String(l.numero_article).padStart(2, "0")}</td>
                <td className="py-2 pr-4">
                  <div className="font-medium">{l.nom}</div>
                  <div className="font-mono text-xs text-zinc-500">{l.prix}.–</div>
                  {nomsLongs.has(l.numero_article) && (
                    <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      Nom long — coupé sur l&apos;étiquette normale
                    </span>
                  )}
                </td>
                <td className="py-2">
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-1.5 text-zinc-700">
                      <input
                        type="checkbox"
                        checked={opt.plusieurs}
                        onChange={(e) => maj(l.numero_article, { plusieurs: e.target.checked })}
                      />
                      Plusieurs
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={opt.quantite}
                        disabled={!opt.plusieurs}
                        onChange={(e) => maj(l.numero_article, { quantite: Number(e.target.value) || 1 })}
                        className="w-14 rounded border border-zinc-300 px-1.5 py-0.5 disabled:bg-zinc-100 disabled:text-zinc-400"
                      />
                    </label>
                    <label className="flex items-center gap-1.5 text-zinc-700">
                      <input
                        type="checkbox"
                        checked={opt.nomEntier}
                        onChange={(e) => maj(l.numero_article, { nomEntier: e.target.checked })}
                      />
                      Nom en entier
                    </label>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {(copiesSupplementaires > 0 || etiquettesTexteSeul > 0) && (
        <div className="mb-8 rounded-md bg-zinc-100 px-4 py-3 text-sm text-zinc-600 print:hidden">
          {slots.length + 1} étiquettes seront imprimées : {labels.length + 1} de base (avec
          l&apos;étiquette coordonnées)
          {copiesSupplementaires > 0 && ` + ${copiesSupplementaires} copie${copiesSupplementaires > 1 ? "s" : ""} supplémentaire${copiesSupplementaires > 1 ? "s" : ""}`}
          {etiquettesTexteSeul > 0 && ` + ${etiquettesTexteSeul} étiquette${etiquettesTexteSeul > 1 ? "s" : ""} « nom en entier »`}.
        </div>
      )}

      {feuilles.map((feuille, indexFeuille) => (
        <div
          key={indexFeuille}
          className={`label-sheet${indexFeuille > 0 ? " label-sheet--nouvelle-page" : ""}`}
        >
          {indexFeuille === 0 && (
            <div className="label label--contact">
              <div className="label__row">
                <span className={special ? "label__vendor label__vendor--special" : "label__vendor"}>
                  #{numeroVendeur}
                </span>
              </div>
              <div className="label__contact-nom">{nomVendeur}</div>
              <div className="label__contact-tel">{telephone || "—"}</div>
              {/* eslint-disable-next-line @next/next/no-img-element -- logo local, pas une ressource à optimiser */}
              <img src="/meeple.png" alt="" className="label__logo" />
            </div>
          )}
          {feuille.map(renderSlot)}
        </div>
      ))}
    </>
  );
}
