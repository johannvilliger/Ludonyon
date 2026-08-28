import { notFound } from "next/navigation";
import { queryOne } from "@/lib/db";
import { PollClient } from "./poll-client";

export const dynamic = "force-dynamic";

export default async function AttentePage({ params }: { params: Promise<{ numero: string }> }) {
  const { numero } = await params;
  const numeroInt = Number(numero);
  if (!Number.isInteger(numeroInt) || numeroInt < 1) notFound();

  const poste = await queryOne<{ type: "vente" | "remboursement" }>(
    "SELECT type FROM postes_caisse WHERE numero = ?",
    [numeroInt],
  );
  if (!poste) notFound();

  const redirectTo = poste.type === "remboursement" ? "/remboursements" : `/caisse/${numeroInt}`;
  const titre = poste.type === "remboursement" ? "Remboursements" : `Caisse ${numeroInt}`;

  return (
    <main className="mx-auto w-full flex max-w-sm flex-1 flex-col justify-center px-6 py-12 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{titre}</h1>
      <PollClient numero={numeroInt} redirectTo={redirectTo} />
    </main>
  );
}
