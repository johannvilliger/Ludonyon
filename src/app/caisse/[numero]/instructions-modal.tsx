"use client";

import { useState } from "react";
import { INSTRUCTIONS_CAISSE } from "@/lib/instructions-caisse";
import { voirInstructions } from "./actions";

export function InstructionsCaisse({ posteId, dejaVues }: { posteId: string; dejaVues: boolean }) {
  const [ouvert, setOuvert] = useState(!dejaVues);

  function fermer() {
    setOuvert(false);
    if (!dejaVues) void voirInstructions(posteId);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="text-xs text-zinc-400 hover:text-zinc-600 hover:underline"
      >
        Revoir les instructions
      </button>

      {ouvert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Instructions caisse</h2>
            <p className="mt-3 text-sm text-zinc-700">{INSTRUCTIONS_CAISSE.fondDeCaisse}</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {INSTRUCTIONS_CAISSE.detailFond.map((piece) => (
                <div
                  key={piece.valeur}
                  className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-center"
                >
                  <span className="font-mono text-base font-semibold text-zinc-800">{piece.qte}×</span>{" "}
                  <span className="font-mono text-base text-zinc-700">{piece.valeur}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm font-medium text-zinc-700">Pour chaque client :</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-zinc-700">
              {INSTRUCTIONS_CAISSE.etapes.map((etape) => (
                <li key={etape}>{etape}</li>
              ))}
            </ol>
            <button
              type="button"
              onClick={fermer}
              className="mt-6 w-full rounded-md bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-800"
            >
              J&apos;ai compris
            </button>
          </div>
        </div>
      )}
    </>
  );
}
