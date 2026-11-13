"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SignaturePad } from "@/components/SignaturePad";
import { confirmerRemiseEnveloppe } from "../actions";

export function ConfirmationRemise({ participationId }: { participationId: string }) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Cochée par défaut : on part du principe que la personne veut être
  // recontactée l'an prochain, sauf si elle dit explicitement le contraire.
  const [souhaiteEtreInforme, setSouhaiteEtreInforme] = useState(true);

  return (
    <div className="mt-6">
      <label className="flex items-start gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={souhaiteEtreInforme}
          onChange={(e) => setSouhaiteEtreInforme(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0"
        />
        <span>Souhaite être informé·e du prochain troc (par email).</span>
      </label>

      <p className="mt-4 text-sm font-medium text-zinc-700">
        Faites signer la personne ci-dessous pour confirmer la remise de son enveloppe.
      </p>
      <div className="mt-3">
        <SignaturePad
          onValider={(dataUrl) => {
            setErreur(null);
            startTransition(async () => {
              const resultat = await confirmerRemiseEnveloppe(participationId, dataUrl, souhaiteEtreInforme);
              if (resultat.error) {
                setErreur(resultat.error);
                return;
              }
              router.refresh();
            });
          }}
        />
      </div>
      {pending && <p className="mt-2 text-sm text-zinc-500">Enregistrement…</p>}
      {erreur && <p className="mt-2 text-sm text-red-600">{erreur}</p>}
    </div>
  );
}
