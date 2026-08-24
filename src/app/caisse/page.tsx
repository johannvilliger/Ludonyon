import Link from "next/link";
import { query, queryOne } from "@/lib/db";
import { NouvelleCaisseForm } from "./nouvelle-caisse-form";

// Toujours refléter l'état courant des caisses — jamais prérendu au build.
export const dynamic = "force-dynamic";

type Caisse = { id: string; nom: string; fond_initial: number };

export default async function CaissePage() {
  const edition = await queryOne<{ id: string }>("SELECT id FROM editions WHERE statut = 'ouverte' LIMIT 1");

  let caisses: Caisse[] = [];
  if (edition) {
    caisses = await query<Caisse>("SELECT id, nom, fond_initial FROM caisses WHERE edition_id = ? ORDER BY nom", [
      edition.id,
    ]);
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Caisse</h1>
      <p className="mt-2 text-zinc-600">Choisis une caisse déjà ouverte, ou ouvres-en une nouvelle.</p>

      {!edition && (
        <p className="mt-6 text-sm text-red-600">Aucune édition n&apos;est ouverte actuellement.</p>
      )}

      {edition && (
        <>
          {caisses.length > 0 && (
            <ul className="mt-6 divide-y divide-zinc-200 rounded-md border border-zinc-200">
              {caisses.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/caisse/${c.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50"
                  >
                    <span className="font-medium">{c.nom}</span>
                    <span className="text-sm text-zinc-500">Fonds initial : {c.fond_initial}.–</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6">
            <NouvelleCaisseForm />
          </div>
        </>
      )}
    </main>
  );
}
