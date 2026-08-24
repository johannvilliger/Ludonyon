import { notFound } from "next/navigation";
import { PollClient } from "./poll-client";

export default async function AttentePage({ params }: { params: Promise<{ numero: string }> }) {
  const { numero } = await params;
  const numeroInt = Number(numero);
  if (!Number.isInteger(numeroInt) || numeroInt < 1 || numeroInt > 5) notFound();

  return (
    <main className="mx-auto flex max-w-sm flex-1 flex-col justify-center px-6 py-12 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Caisse {numeroInt}</h1>
      <PollClient numero={numeroInt} />
    </main>
  );
}
