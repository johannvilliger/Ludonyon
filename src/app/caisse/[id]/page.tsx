import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { CaisseScanner } from "./caisse-scanner";

type Caisse = { id: string; nom: string; edition_id: string; editions: { taux_achat: number } };

export default async function CaisseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: caisse } = await supabase
    .from("caisses")
    .select("id, nom, edition_id, editions(taux_achat)")
    .eq("id", id)
    .single<Caisse>();

  if (!caisse) notFound();

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <Link href="/caisse" className="text-sm text-zinc-500 hover:underline">
        ← Caisses
      </Link>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{caisse.nom}</h1>

      <div className="mt-8">
        <CaisseScanner
          caisseId={caisse.id}
          editionId={caisse.edition_id}
          tauxAchat={caisse.editions.taux_achat}
        />
      </div>
    </main>
  );
}
