import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col justify-center px-6 py-12">
      <h1 className="text-4xl font-semibold tracking-tight">Troc de la Ludothèque Nyon Région</h1>
      <p className="mt-3 text-zinc-600">
        Déposez votre liste de jeux et jouets avant le troc, récupérez votre numéro de vendeur, et
        revenez le jour du dépôt avec vos articles.
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
