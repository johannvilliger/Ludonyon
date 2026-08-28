"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formaterMontant } from "@/lib/argent";
import {
  rechercherVentesPourRemboursement,
  rembourserArticles,
  type LigneRemboursable,
} from "./actions";

function formaterHeure(iso: string): string {
  return new Date(iso.replace(" ", "T")).toLocaleString("fr-CH");
}

export function RechercheRemboursement({ caisseId, editionId }: { caisseId: string; editionId: string }) {
  const router = useRouter();
  const [numeroVendeur, setNumeroVendeur] = useState("");
  const [numeroArticle, setNumeroArticle] = useState("");
  const [heure, setHeure] = useState("");
  const [resultats, setResultats] = useState<LigneRemboursable[] | null>(null);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [effectuePar, setEffectuePar] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const rechercher = () => {
    setErreur(null);
    setSucces(null);
    startTransition(async () => {
      const resultat = await rechercherVentesPourRemboursement(editionId, {
        numeroVendeur: numeroVendeur.trim() ? Number(numeroVendeur) : undefined,
        numeroArticle: numeroArticle.trim() ? Number(numeroArticle) : undefined,
        heure: heure.trim() || undefined,
      });
      setResultats(resultat);
      setSelection(new Set());
    });
  };

  const basculer = (id: string) => {
    setSelection((prev) => {
      const suivant = new Set(prev);
      if (suivant.has(id)) suivant.delete(id);
      else suivant.add(id);
      return suivant;
    });
  };

  const lignesSelectionnees = (resultats ?? []).filter((l) => selection.has(l.venteArticleId));
  const totalSelection = lignesSelectionnees.reduce((sum, l) => sum + l.prixEncaisse, 0);

  const rembourser = () => {
    if (!window.confirm(`Rembourser ${lignesSelectionnees.length} article(s) pour ${formaterMontant(totalSelection)} ?`))
      return;
    setErreur(null);
    setSucces(null);
    startTransition(async () => {
      const resultat = await rembourserArticles(caisseId, [...selection], effectuePar);
      if (!resultat.ok) {
        setErreur(resultat.error);
        return;
      }
      setSucces(`${lignesSelectionnees.length} article(s) remboursé(s) — ${formaterMontant(resultat.total)}.`);
      setResultats((prev) => (prev ?? []).filter((l) => !selection.has(l.venteArticleId)));
      setSelection(new Set());
      // Rafraîchit l'historique et le théorique affichés par le parent
      // serveur (comptés côté DB, pas gardés en état local ici).
      router.refresh();
    });
  };

  return (
    <div>
      <h2 className="text-lg font-semibold">Rechercher une vente</h2>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-zinc-700" htmlFor="numero-vendeur">
            N° vendeur
          </label>
          <input
            id="numero-vendeur"
            type="number"
            value={numeroVendeur}
            onChange={(e) => setNumeroVendeur(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700" htmlFor="numero-article">
            N° article
          </label>
          <input
            id="numero-article"
            type="number"
            value={numeroArticle}
            onChange={(e) => setNumeroArticle(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700" htmlFor="heure-vente">
            Heure (approx.)
          </label>
          <input
            id="heure-vente"
            type="time"
            value={heure}
            onChange={(e) => setHeure(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
          />
        </div>
      </div>

      <button
        type="button"
        disabled={pending || (!numeroVendeur.trim() && !numeroArticle.trim() && !heure.trim())}
        onClick={rechercher}
        className="mt-3 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {pending ? "…" : "Rechercher"}
      </button>

      {resultats !== null && (
        <div className="mt-4">
          {resultats.length === 0 ? (
            <p className="text-sm text-zinc-500">Aucune vente correspondante (ou déjà remboursée).</p>
          ) : (
            <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200">
              {resultats.map((l) => (
                <li key={l.venteArticleId} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selection.has(l.venteArticleId)}
                    onChange={() => basculer(l.venteArticleId)}
                    className="h-4 w-4"
                  />
                  <span className="flex-1">
                    <span className="font-medium">{l.nom}</span>
                    <span className="ml-2 text-xs text-zinc-500">
                      vendeur n° {l.numeroVendeur} · art. n° {l.numeroArticle} · caisse {l.numeroCaisseOrigine} ·{" "}
                      {formaterHeure(l.venteCreatedAt)}
                    </span>
                  </span>
                  <span className="font-medium">{formaterMontant(l.prixEncaisse)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {selection.size > 0 && (
        <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm">
            {selection.size} article(s) sélectionné(s) — total à rembourser :{" "}
            <strong>{formaterMontant(totalSelection)}</strong>
          </p>
          <label className="mt-2 block text-sm font-medium text-zinc-700" htmlFor="effectue-par">
            Remboursement effectué par
          </label>
          <input
            id="effectue-par"
            type="text"
            value={effectuePar}
            onChange={(e) => setEffectuePar(e.target.value)}
            placeholder="Prénom"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
          />
          <button
            type="button"
            disabled={pending || !effectuePar.trim()}
            onClick={rembourser}
            className="mt-3 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {pending ? "…" : "Rembourser"}
          </button>
        </div>
      )}

      {erreur && <p className="mt-3 text-sm text-red-600">{erreur}</p>}
      {succes && <p className="mt-3 text-sm text-emerald-700">{succes}</p>}
    </div>
  );
}
