"use client";

import { useState, useTransition } from "react";
import { formaterTelephone } from "@/lib/telephone";
import { modifierCoordonneesVendeur } from "./actions";

export function CoordonneesEditor({
  code,
  nomInitial,
  telephoneInitial,
  emailInitial,
}: {
  code: string;
  nomInitial: string;
  telephoneInitial: string | null;
  emailInitial: string | null;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState(nomInitial);
  const [telephone, setTelephone] = useState(telephoneInitial ?? "");
  const [email, setEmail] = useState(emailInitial ?? "");
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!ouvert) {
    return (
      <button type="button" onClick={() => setOuvert(true)} className="text-xs text-zinc-400 hover:underline">
        Corriger les coordonnées
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-md border border-zinc-200 p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Nom"
          className="rounded border border-zinc-300 px-2 py-1 text-sm"
        />
        <input
          value={telephone}
          onChange={(e) => setTelephone(formaterTelephone(e.target.value))}
          placeholder="Téléphone"
          className="rounded border border-zinc-300 px-2 py-1 text-sm"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (facultatif)"
          className="rounded border border-zinc-300 px-2 py-1 text-sm"
        />
      </div>
      {erreur && <p className="mt-2 text-xs text-red-600">{erreur}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setErreur(null);
            startTransition(async () => {
              try {
                await modifierCoordonneesVendeur(code, nom, telephone, email);
                setOuvert(false);
              } catch (err) {
                setErreur(err instanceof Error ? err.message : "Impossible d'enregistrer.");
              }
            });
          }}
          className="rounded border border-zinc-300 px-3 py-1 text-xs font-medium hover:border-zinc-400 disabled:opacity-50"
        >
          {pending ? "…" : "Enregistrer"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOuvert(false);
            setErreur(null);
            setNom(nomInitial);
            setTelephone(telephoneInitial ?? "");
            setEmail(emailInitial ?? "");
          }}
          className="rounded border border-zinc-300 px-3 py-1 text-xs hover:border-zinc-400"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
