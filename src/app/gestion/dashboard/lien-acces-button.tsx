"use client";

import { useState } from "react";

export function LienAccesButton({ label, lien, qrDataUrl }: { label: string; lien: string; qrDataUrl: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [copie, setCopie] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-label={`Lien/QR d'accès direct — ${label}`}
        title="Lien/QR d'accès direct (connecte sans retaper le code)"
        className="shrink-0 rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm hover:border-zinc-400"
      >
        🔗
      </button>
      {ouvert && (
        <>
          {/* Ferme le panneau au clic en dehors, sans gérer un ref/listener dédié. */}
          <button
            type="button"
            aria-label="Fermer"
            onClick={() => setOuvert(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute right-0 z-20 mt-2 w-64 rounded-md border border-zinc-200 bg-white p-3 shadow-lg">
            <p className="text-xs text-zinc-500">{label} — accès direct</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt={`QR d'accès ${label}`} width={170} height={170} className="mx-auto mt-2" />
            <div className="mt-2 flex items-center gap-1">
              <input
                readOnly
                value={lien}
                onFocus={(e) => e.target.select()}
                className="min-w-0 flex-1 rounded border border-zinc-300 px-1.5 py-1 text-[11px] font-mono"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(lien).then(() => {
                    setCopie(true);
                    setTimeout(() => setCopie(false), 1500);
                  });
                }}
                className="shrink-0 rounded border border-zinc-300 px-2 py-1 text-xs hover:border-zinc-400"
              >
                {copie ? "✓" : "Copier"}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-zinc-400">
              À scanner ou à mettre en raccourci — connecte directement, sans retaper le code. En cas de perte ou
              de vol, changez simplement le code ci-contre : ce lien cesse aussitôt de fonctionner.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
