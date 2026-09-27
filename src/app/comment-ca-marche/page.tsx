import Link from "next/link";
import Image from "next/image";

type Guide = {
  titre: string;
  sousTitre: string;
  src: string;
  largeur: number;
  hauteur: number;
  alt: string;
};

// Les 4 guides envoyés par Johann, dans l'ordre chronologique du troc.
// Le premier (dépôt de liste) est aussi repris sur la page d'accueil —
// dupliqué ici volontairement pour que cette page raconte l'histoire
// complète sans renvoyer ailleurs au milieu.
const GUIDES: Guide[] = [
  {
    titre: "1. Déposez votre liste en ligne",
    sousTitre: "Depuis chez vous, en quelques minutes.",
    src: "/guide-depot-liste.jpg",
    largeur: 1671,
    hauteur: 941,
    alt: "Les 5 étapes pour déposer votre liste : préparez vos jeux et jouets, vérifiez et emballez, créez votre liste en ligne, recevez votre numéro de vendeur et votre QR code, vos articles sont prêts.",
  },
  {
    titre: "2. Le jour du dépôt en personne",
    sousTitre: "Apportez vos articles avec votre QR code.",
    src: "/guide-jour-depot.jpg",
    largeur: 1671,
    hauteur: 941,
    alt: "Les 5 étapes du jour du dépôt : le dépôt approche, n'oubliez pas votre QR code, rendez-vous à la salle communale de Nyon, présentez votre QR code au dépôt, c'est terminé — frais de gestion de 10% sur la vente de vos articles.",
  },
  {
    titre: "3. Le jour du troc",
    sousTitre: "Ouvert à tous — petits prix, grandes trouvailles.",
    src: "/guide-jour-vente.webp",
    largeur: 1672,
    hauteur: 940,
    alt: "Le troc, c'est aujourd'hui : des jeux, puzzles, livres et vélos pour tous les goûts, à petits prix. Infos pratiques : samedi 21 novembre 2026, 9h-13h, salle communale de Nyon, paiement uniquement en cash, 10% de frais ajoutés au prix de vente pour l'acheteur.",
  },
  {
    titre: "4. La restitution",
    sousTitre: "Récupérez le montant de vos ventes et vos invendus.",
    src: "/guide-restitution.webp",
    largeur: 1672,
    hauteur: 941,
    alt: "Dernière étape, la restitution : samedi 21 novembre 2026 à 18h, salle communale de Nyon. Récupérez le montant de vos ventes (10% sont déduits du prix de vente), reprenez vos invendus ou laissez-les pour des associations.",
  },
];

export default function CommentCaMarchePage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        ← Accueil
      </Link>

      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Comment fonctionne le troc ?</h1>
      <p className="mt-3 text-zinc-600">Le principe en 4 étapes, en image.</p>

      {GUIDES.map((guide) => (
        <div key={guide.src} className="mt-8 overflow-hidden rounded-xl border border-zinc-200">
          <div className="px-5 pb-1 pt-4">
            <h2 className="text-base font-semibold">{guide.titre}</h2>
            <p className="mt-0.5 text-sm text-zinc-500">{guide.sousTitre}</p>
          </div>
          <Image
            src={guide.src}
            alt={guide.alt}
            width={guide.largeur}
            height={guide.hauteur}
            sizes="(max-width: 672px) 100vw, 672px"
            className="mt-3 h-auto w-full"
          />
        </div>
      ))}
    </main>
  );
}
