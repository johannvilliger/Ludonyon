import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { NouvelleCaisseForm } from "./nouvelle-caisse-form";

type Caisse = { id: string; nom: string; fond_initial: number };

export default async function CaissePage() {
  const supabase = createServiceClient();

  const { data: edition } = await supabase
    .from("editions")
    .select("id")
    .eq("statut", "ouverte")
    .single();

  let caisses: Caisse[] = [];
  if (edition) {
    const { data } = await supabase
      .from("caisses")
      .select("id, nom, fond_initial")
      .eq("edition_id", edition.id)
      .order("nom")
      .returns<Caisse[]>();
    caisses = data ?? [];
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
