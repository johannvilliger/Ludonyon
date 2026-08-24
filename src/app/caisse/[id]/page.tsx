import { notFound } from "next/navigation";
import Link from "next/link";
import { queryOne } from "@/lib/db";
import { CaisseScanner } from "./caisse-scanner";

type Caisse = { id: string; nom: string; edition_id: string; taux_achat: number };

export default async function CaisseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const caisse = await queryOne<Caisse>(
    `SELECT c.id, c.nom, c.edition_id, e.taux_achat
     FROM caisses c
     JOIN editions e ON e.id = c.edition_id
     WHERE c.id = ?`,
    [id],
  );

  if (!caisse) notFound();

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <Link href="/caisse" className="text-sm text-zinc-500 hover:underline">
        ← Caisses
      </Link>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{caisse.nom}</h1>

      <div className="mt-8">
        <CaisseScanner caisseId={caisse.id} editionId={caisse.edition_id} tauxAchat={Number(caisse.taux_achat)} />
      </div>
    </main>
  );
}
