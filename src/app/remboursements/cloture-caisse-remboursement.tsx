"use client";

import { useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { formaterMontant } from "@/lib/argent";
import { cloturerCaisse } from "@/app/caisse/[numero]/actions";
import { theoriqueCaisseRemboursement } from "./actions";

export function ClotureCaisseRemboursement({
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
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => {
          setOuvert(true);
          setChargement(true);
          theoriqueCaisseRemboursement(caisseId)
            .then(setTheorique)
            .catch(() => {})
            .finally(() => setChargement(false));
        }}
        className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:border-red-400 hover:bg-red-50"
      >
        Clôturer ce poste de remboursement
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold">Clôture du poste de remboursement</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-700">
          <li>Comptez tout l&apos;argent physiquement dans le tiroir.</li>
          <li>
            Retirez les 250.– de fond de départ. Il devrait rester{" "}
            <strong>{chargement ? "…" : formaterMontant(theorique)}</strong> par rapport à ce fond (négatif : c&apos;est
            attendu, c&apos;est l&apos;argent rendu aux acheteurs).
          </li>
          <li>Entrez ci-dessous ce montant net (peut être négatif).</li>
        </ol>

        <label className="mt-4 block text-sm font-medium text-zinc-700" htmlFor="montant-cloture-remb">
          Montant réel net (sans les 250.–)
        </label>
        <input
          id="montant-cloture-remb"
          type="number"
          step="any"
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
          placeholder="CHF"
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
        />

        {erreur && <p className="mt-3 text-sm text-red-600">{erreur}</p>}

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
                  "Clôturer définitivement ce poste de remboursement pour cette édition ? Vous ne pourrez plus vous y reconnecter ensuite.",
                )
              )
                return;
              setErreur(null);
              startTransition(async () => {
                try {
                  await cloturerCaisse(caisseId, posteId, Number(montant));
                } catch (err) {
                  unstable_rethrow(err);
                  setErreur("Connexion perdue — réessayez, la clôture n'a pas été enregistrée.");
                }
              });
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
