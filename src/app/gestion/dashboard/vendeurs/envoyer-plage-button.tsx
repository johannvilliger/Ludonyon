"use client";

import { useState, useTransition } from "react";
import { envoyerEtiquettesPlage } from "./actions";

export function EnvoyerPlageButton() {
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  function envoyer() {
    const x = Number(debut);
    const y = Number(fin);
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 1 || y < x) {
      setErreur("Entrez deux numéros de vendeur valides (début ≤ fin).");
      setMessage(null);
      return;
    }
    if (
      !window.confirm(
        `Envoyer à l'impression centralisée les étiquettes des vendeurs n° ${x} à ${y} ? Une étiquette normale par article (hors refusés), comme l'envoi un par un depuis la fiche vendeur.`,
      )
    )
      return;

    setErreur(null);
    setMessage(null);
    startTransition(async () => {
      const resultat = await envoyerEtiquettesPlage(x, y);
      if (!resultat.ok) {
        setErreur(resultat.error);
        return;
      }
      let texte = `${resultat.nbFeuilles} feuille${resultat.nbFeuilles > 1 ? "s" : ""} envoyée${resultat.nbFeuilles > 1 ? "s" : ""} à l'impression.`;
      if (resultat.nbVendeursSansArticle > 0) {
        texte += ` ${resultat.nbVendeursSansArticle} vendeur${resultat.nbVendeursSansArticle > 1 ? "s" : ""} sans article imprimable dans cette plage, ignoré${resultat.nbVendeursSansArticle > 1 ? "s" : ""}.`;
      }
      setMessage(texte);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-zinc-300 px-3 py-2">
      <span className="text-sm text-zinc-600">Étiquettes vendeurs n°</span>
      <input
        type="number"
        min={1}
        placeholder="De"
        value={debut}
        onChange={(e) => setDebut(e.target.value)}
        className="w-20 rounded-md border border-zinc-300 px-2 py-1 text-sm"
      />
      <span className="text-sm text-zinc-400">à</span>
      <input
        type="number"
        min={1}
        placeholder="À"
        value={fin}
        onChange={(e) => setFin(e.target.value)}
        className="w-20 rounded-md border border-zinc-300 px-2 py-1 text-sm"
      />
      <button
        type="button"
        disabled={pending}
        onClick={envoyer}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:border-zinc-400 disabled:opacity-50"
      >
        {pending ? "Envoi…" : "Envoyer à l'impression centralisée"}
      </button>
      {message && <p className="w-full text-sm text-emerald-700">{message}</p>}
      {erreur && <p className="w-full text-sm text-red-600">{erreur}</p>}
    </div>
  );
}
