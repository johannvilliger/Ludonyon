"use client";

import { useRef, useState } from "react";
import {
  encaisserPanier,
  rechercherArticle,
  type ArticleTrouve,
} from "./actions";

function prixAffiche(article: ArticleTrouve, acheteurBenevole: boolean, tauxAchat: number) {
  return acheteurBenevole ? article.prix : Math.round(article.prix * (1 + tauxAchat));
}

export function CaisseScanner({
  caisseId,
  editionId,
  tauxAchat,
}: {
  caisseId: string;
  editionId: string;
  tauxAchat: number;
}) {
  const [panier, setPanier] = useState<ArticleTrouve[]>([]);
  const [acheteurBenevole, setAcheteurBenevole] = useState(false);
  const [code, setCode] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    const valeur = code.trim();
    setCode("");
    inputRef.current?.focus();
    if (!valeur) return;

    setErreur(null);
    setConfirmation(null);

    const resultat = await rechercherArticle(editionId, valeur);
    if (!resultat.ok) {
      setErreur(resultat.error);
      return;
    }

    if (panier.some((a) => a.articleId === resultat.article.articleId)) {
      setErreur(`« ${resultat.article.nom} » est déjà dans le panier.`);
      return;
    }

    setPanier((prev) => [...prev, resultat.article]);
  }

  function retirer(articleId: string) {
    setPanier((prev) => prev.filter((a) => a.articleId !== articleId));
  }

  async function handleEncaisser() {
    setEnCours(true);
    setErreur(null);
    const resultat = await encaisserPanier(
      caisseId,
      editionId,
      acheteurBenevole,
      panier.map((a) => a.articleId),
    );
    setEnCours(false);

    if (!resultat.ok) {
      setErreur(resultat.error);
      return;
    }

    setConfirmation(`Encaissé : ${resultat.total}.–`);
    setPanier([]);
    setAcheteurBenevole(false);
    inputRef.current?.focus();
  }

  const total = panier.reduce((sum, a) => sum + prixAffiche(a, acheteurBenevole, tauxAchat), 0);

  return (
    <div>
      <form onSubmit={handleScan} className="flex gap-2">
        <input
          ref={inputRef}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Scanner ou taper le code (ex. 142-07-8)"
          autoFocus
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2 font-mono"
        />
        <button
          type="submit"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:border-zinc-400"
        >
          Ajouter
        </button>
      </form>

      {erreur && <p className="mt-3 text-sm text-red-600">{erreur}</p>}
      {confirmation && <p className="mt-3 text-sm text-green-700">{confirmation}</p>}

      <label className="mt-6 flex items-center gap-2 text-sm font-medium text-zinc-700">
        <input
          type="checkbox"
          checked={acheteurBenevole}
          onChange={(e) => setAcheteurBenevole(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-300"
        />
        Acheteur bénévole (pas de +10%)
      </label>

      <ul className="mt-4 divide-y divide-zinc-200 rounded-md border border-zinc-200">
        {panier.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-zinc-400">Panier vide</li>
        )}
        {panier.map((a) => (
          <li key={a.articleId} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">{a.nom}</p>
              <p className="text-xs text-zinc-500">
                Vendeur #{a.numeroVendeur} — {a.nomVendeur}
                {a.estBenevole && " (bénévole)"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm">{prixAffiche(a, acheteurBenevole, tauxAchat)}.–</span>
              <button
                type="button"
                onClick={() => retirer(a.articleId)}
                aria-label="Retirer du panier"
                className="text-lg text-zinc-400 hover:text-red-600"
              >
                ×
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between">
        <span className="text-lg font-medium">Total : {total}.–</span>
        <button
          type="button"
          onClick={handleEncaisser}
          disabled={panier.length === 0 || enCours}
          className="rounded-md bg-zinc-900 px-6 py-3 font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {enCours ? "Encaissement…" : "Encaisser"}
        </button>
      </div>
    </div>
  );
}
