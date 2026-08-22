import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col justify-center px-6 py-12">
      <h1 className="text-4xl font-semibold tracking-tight">Troc de la ludothèque</h1>
      <p className="mt-3 text-zinc-600">
        Dépose ta liste de jeux et jouets avant le troc, récupère ton numéro de vendeur, et
        reviens le jour du dépôt avec tes articles.
      </p>
      <Link
        href="/vendeur/nouveau"
        className="mt-8 inline-flex w-fit items-center rounded-md bg-zinc-900 px-5 py-3 font-medium text-white hover:bg-zinc-800"
      >
        Déposer ma liste
      </Link>
    </main>
  );
}
