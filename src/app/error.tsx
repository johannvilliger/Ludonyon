"use client";

import { useEffect } from "react";

// Filet de sécurité générique : sans ce fichier, un plantage imprévu
// n'importe où dans l'appli (caisse, accueil, gestion...) affiche l'écran
// technique par défaut de Next.js. Ici on garde le header/footer du layout
// (seul le contenu de la page est remplacé) et on propose de réessayer sans
// perdre son chemin.
export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Un problème est survenu</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Rien n&apos;a été perdu — c&apos;est probablement temporaire (réseau, page rechargée au mauvais
        moment...). Réessayez, ou revenez à l&apos;accueil si ça persiste.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Réessayer
        </button>
        {/* Ancre classique plutôt que <Link> : un plantage peut venir d'un
            état cassé du routeur client, une vraie navigation complète est
            plus sûre pour repartir de zéro. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:border-zinc-400"
        >
          Accueil
        </a>
      </div>
    </main>
  );
}
