import Link from "next/link";

// Mode d'emploi imagé du troc, accessible depuis la page d'accueil. Page
// statique volontairement simple : pas de données à charger, juste le
// texte d'intro et l'image envoyée par Johann (voir le bloc image
// ci-dessous, à remplacer dès qu'elle est reçue — PAS DE MISE EN LIGNE
// tant que ce n'est pas fait, voir consigne du 2026-09-26).
export default function CommentCaMarchePage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        ← Accueil
      </Link>

      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Comment fonctionne le troc ?</h1>
      <p className="mt-3 text-zinc-600">
        Le principe en quelques étapes, en image.
      </p>

      {/* Emplacement de l'image envoyée par Johann — remplacer ce bloc par
          un simple <img src="/comment-ca-marche.png" alt="..." /> une fois
          le fichier reçu et placé dans public/. */}
      <div className="mt-8 flex min-h-64 items-center justify-center rounded-md border border-dashed border-zinc-300 text-sm text-zinc-400">
        Image à venir
      </div>
    </main>
  );
}
