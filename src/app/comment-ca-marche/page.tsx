import Link from "next/link";
import Image from "next/image";

// Mode d'emploi imagé du troc, accessible depuis la page d'accueil. Les 2
// guides envoyés par Johann, dans l'ordre chronologique : d'abord déposer
// sa liste en ligne (repris de la page d'accueil), puis le jour du dépôt
// en personne (la suite de l'histoire, qu'on ne raconte pas sur l'accueil
// pour ne pas la surcharger).
export default function CommentCaMarchePage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        ← Accueil
      </Link>

      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Comment fonctionne le troc ?</h1>
      <p className="mt-3 text-zinc-600">Le principe en 2 étapes, en image.</p>

      <div className="mt-8 overflow-hidden rounded-xl border border-zinc-200">
        <div className="px-5 pb-1 pt-4">
          <h2 className="text-base font-semibold">1. Déposez votre liste en ligne</h2>
          <p className="mt-0.5 text-sm text-zinc-500">Depuis chez vous, en quelques minutes.</p>
        </div>
        <Image
          src="/guide-depot-liste.jpg"
          alt="Les 5 étapes pour déposer votre liste : préparez vos jeux et jouets, vérifiez et emballez, créez votre liste en ligne, recevez votre numéro de vendeur et votre QR code, vos articles sont prêts."
          width={1671}
          height={941}
          sizes="(max-width: 672px) 100vw, 672px"
          className="mt-3 h-auto w-full"
        />
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-zinc-200">
        <div className="px-5 pb-1 pt-4">
          <h2 className="text-base font-semibold">2. Le jour du dépôt en personne</h2>
          <p className="mt-0.5 text-sm text-zinc-500">Apportez vos articles avec votre QR code.</p>
        </div>
        <Image
          src="/guide-jour-depot.jpg"
          alt="Les 5 étapes du jour du dépôt : le dépôt approche, n'oubliez pas votre QR code, rendez-vous à la salle communale de Nyon, présentez votre QR code au dépôt, c'est terminé — frais de gestion de 10% sur la vente de vos articles."
          width={1671}
          height={941}
          sizes="(max-width: 672px) 100vw, 672px"
          className="mt-3 h-auto w-full"
        />
      </div>
    </main>
  );
}
