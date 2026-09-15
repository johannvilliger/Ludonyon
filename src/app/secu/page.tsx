import { redirect } from "next/navigation";
import Link from "next/link";
import { query } from "@/lib/db";
import { dashboardEstConnecte } from "@/lib/gestion";

export const dynamic = "force-dynamic";

type BlocageLigne = {
  id: string;
  ip: string;
  formulaire: string;
  bloque_le: string;
};

// Page volontairement sans lien dans le menu (accès direct par URL
// uniquement) — protégée par le même code dashboard que le reste de la
// gestion, voir dashboardEstConnecte.
export default async function SecuPage() {
  if (!(await dashboardEstConnecte())) redirect("/gestion");

  const blocages = await query<BlocageLigne>(
    "SELECT id, ip, formulaire, bloque_le FROM blocages_ip ORDER BY bloque_le DESC LIMIT 500",
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link href="/gestion/dashboard" className="text-sm text-zinc-500 hover:underline">
        ← Dashboard
      </Link>

      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Sécurité — blocages IP</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Historique des blocages déclenchés par la protection anti-brute-force (5 échecs de connexion en 1
        minute sur un même formulaire) — voir src/lib/rate-limit.ts.
      </p>

      {blocages.length === 0 && (
        <p className="mt-6 text-sm text-zinc-500">Aucun blocage enregistré pour le moment.</p>
      )}

      <ul className="mt-6 divide-y divide-zinc-200 rounded-md border border-zinc-200">
        {blocages.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
            <span className="font-mono">{b.ip}</span>
            <span className="text-zinc-500">{b.formulaire}</span>
            <span className="text-xs text-zinc-400">
              {new Date(b.bloque_le.replace(" ", "T")).toLocaleString("fr-CH")}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
