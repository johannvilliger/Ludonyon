"use client";

import { useState, useTransition } from "react";
import { INSTRUCTIONS_CLOTURE } from "@/lib/instructions-caisse";
import { cloturerCaisse, theoriqueCaisse } from "./actions";

export function ClotureCaisse({
  caisseId,
  posteId,
  montantTheorique,
}: {
  caisseId: string;
  posteId: string;
  montantTheorique: number;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [theorique, setTheorique] = useState(montantTheorique);
  const [chargement, setChargement] = useState(false);
  const [montant, setMontant] = useState("");
  const [pending, startTransition] = useTransition();

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => {
          setOuvert(true);
          setChargement(true);
          theoriqueCaisse(caisseId)
            .then(setTheorique)
            .finally(() => setChargement(false));
        }}
        className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:border-red-400 hover:bg-red-50"
      >
        Clôturer ma caisse
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold">{INSTRUCTIONS_CLOTURE.titre}</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-700">
          <li>{INSTRUCTIONS_CLOTURE.etapes[0]}</li>
          <li>
            {INSTRUCTIONS_CLOTURE.etapes[1]} Vous devriez avoir{" "}
            <strong>{chargement ? "…" : `${theorique}.–`}</strong> en caisse.
          </li>
          <li>{INSTRUCTIONS_CLOTURE.etapes[2]}</li>
        </ol>

        <label className="mt-4 block text-sm font-medium text-zinc-700" htmlFor="montant-cloture">
          Montant réel compté (sans les 250.–)
        </label>
        <input
          id="montant-cloture"
          type="number"
          min={0}
          step={1}
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
          placeholder="CHF"
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
        />

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOuvert(false)}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm hover:border-zinc-400"
          >
            Retour
          </button>
          <button
            type="button"
            disabled={pending || montant.trim() === ""}
            onClick={() => {
              if (
                !window.confirm(
                  "Clôturer définitivement cette caisse pour cette édition ? Vous ne pourrez plus vous y reconnecter ensuite.",
                )
              )
                return;
              startTransition(() => cloturerCaisse(caisseId, posteId, Number(montant)));
            }}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {pending ? "…" : "Valider et clôturer"}
          </button>
        </div>
      </div>
    </div>
  );
}
