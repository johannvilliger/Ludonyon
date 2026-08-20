"use client";

import { useState } from "react";

export default function CalendarSubscribeLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const webcalUrl = url.replace(/^https?:\/\//, "webcal://");

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-3 rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-sm text-stone-600">
        Abonnez votre calendrier (Google Calendar, Apple Calendar, Outlook) à
        ce lien pour voir vos événements et tâches se mettre à jour
        automatiquement.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a
          href={webcalUrl}
          className="rounded-lg border-2 border-black bg-brand-yellow px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-brand-yellow-dark"
        >
          S’abonner
        </a>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100"
        >
          {copied ? "Lien copié !" : "Copier le lien"}
        </button>
      </div>
    </div>
  );
}
