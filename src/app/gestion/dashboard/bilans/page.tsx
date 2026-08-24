import { redirect } from "next/navigation";
import Link from "next/link";
import { query } from "@/lib/db";
import { dashboardEstConnecte } from "@/lib/gestion";

export const dynamic = "force-dynamic";

const LABELS_PHASE: Record<string, string> = {
  depot: "Dépôt en ligne",
  reception: "Réception",
  caisse: "Caisse",
  post_vente: "Post-vente",
  terminee: "Terminée",
};

type EditionLigne = { id: string; annee: number; phase: string };

export default async function BilansListePage() {
  if (!(await dashboardEstConnecte())) redirect("/gestion");

  const editions = await query<EditionLigne>("SELECT id, annee, phase FROM editions ORDER BY annee DESC");

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <Link href="/gestion/dashboard" className="text-sm text-zinc-500 hover:underline">
        ← Dashboard
      </Link>

      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Bilans</h1>
      <p className="mt-2 text-sm text-zinc-600">Toutes les éditions, actives ou passées.</p>

      {editions.length === 0 && <p className="mt-6 text-sm text-zinc-500">Aucune édition pour le moment.</p>}

      <ul className="mt-6 divide-y divide-zinc-200 rounded-md border border-zinc-200">
        {editions.map((e) => (
          <li key={e.id}>
            <Link
              href={`/gestion/dashboard/bilans/${e.id}`}
              className="flex items-center justify-between px-4 py-3 text-sm hover:bg-zinc-50"
            >
              <span className="font-medium">Édition {e.annee}</span>
              <span className="text-zinc-500">{LABELS_PHASE[e.phase] ?? e.phase}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
