"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SignaturePad } from "@/components/SignaturePad";
import { confirmerRemiseEnveloppe } from "../actions";

export function ConfirmationRemise({ participationId }: { participationId: string }) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-6">
      <p className="text-sm font-medium text-zinc-700">
        Faites signer la personne ci-dessous pour confirmer la remise de son enveloppe.
      </p>
      <div className="mt-3">
        <SignaturePad
          onValider={(dataUrl) => {
            setErreur(null);
            startTransition(async () => {
              const resultat = await confirmerRemiseEnveloppe(participationId, dataUrl);
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
