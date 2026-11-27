"use client";

import { useState, useTransition } from "react";
import { demanderQuittanceRetroactive, imprimerQuittanceRetroactive } from "./actions";

export function ActionsQuittanceVente({ venteId }: { venteId: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null);

  function envoyer() {
    setMessage(null);
    startTransition(async () => {
      const resultat = await demanderQuittanceRetroactive(venteId, email);
      setMessage({ texte: resultat.ok ? "Quittance envoyée." : (resultat.error ?? "Échec."), erreur: !resultat.ok });
      if (resultat.ok) {
        setEmail("");
        setOuvert(false);
      }
    });
  }

  function imprimer() {
    setMessage(null);
    startTransition(async () => {
      const resultat = await imprimerQuittanceRetroactive(venteId);
      setMessage({
        texte: resultat.ok ? "Envoyée à l'impression centralisée." : (resultat.error ?? "Échec."),
        erreur: !resultat.ok,
      });
    });
  }

  return (
    <div className="mt-1.5 flex flex-col items-end gap-1 text-xs">
      <div className="flex items-center gap-1.5">
        {ouvert ? (
          <>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemple.ch"
              className="w-40 rounded border border-zinc-300 px-1.5 py-0.5"
            />
            <button
              type="button"
              disabled={pending || !email.trim()}
              onClick={envoyer}
              className="rounded border border-zinc-300 px-2 py-0.5 font-medium hover:border-zinc-400 disabled:opacity-50"
            >
              {pending ? "…" : "Envoyer"}
            </button>
            <button type="button" onClick={() => setOuvert(false)} className="text-zinc-400 hover:underline">
              Annuler
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setOuvert(true)}
            className="rounded border border-zinc-300 px-2 py-0.5 font-medium hover:border-zinc-400"
          >
            Quittance par email
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={imprimer}
          className="rounded border border-zinc-300 px-2 py-0.5 font-medium hover:border-zinc-400 disabled:opacity-50"
        >
          Imprimer
        </button>
      </div>
      {message && <span className={message.erreur ? "text-red-600" : "text-emerald-600"}>{message.texte}</span>}
    </div>
  );
}
