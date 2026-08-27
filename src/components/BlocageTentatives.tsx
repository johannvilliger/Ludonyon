export function BlocageTentatives({ secondesRestantes }: { secondesRestantes: number }) {
  const unite =
    secondesRestantes > 60 ? `${Math.ceil(secondesRestantes / 60)} minute(s)` : `${secondesRestantes} seconde(s)`;

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Trop de tentatives</h1>
      <p className="mt-2 text-zinc-600">Réessayez dans {unite}.</p>
    </main>
  );
}
