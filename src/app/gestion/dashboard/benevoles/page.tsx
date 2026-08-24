import { redirect } from "next/navigation";
import Link from "next/link";
import { query } from "@/lib/db";
import { dashboardEstConnecte } from "@/lib/gestion";
import { estVendeurSpecial } from "@/lib/vendeurs-speciaux";
import { BenevoleForm } from "./benevole-form";

export const dynamic = "force-dynamic";

type BenevoleLigne = {
  numero_fixe: number;
  nom: string;
  telephone: string | null;
  email: string | null;
};

export default async function BenevolesPage() {
  if (!(await dashboardEstConnecte())) redirect("/gestion");

  const benevoles = await query<BenevoleLigne>(
    `SELECT b.numero_fixe, v.nom, v.telephone, v.email
     FROM benevoles b
     JOIN vendeurs v ON v.id = b.vendeur_id
     ORDER BY b.numero_fixe`,
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link href="/gestion/dashboard" className="text-sm text-zinc-500 hover:underline">
        ← Dashboard
      </Link>

      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Vendeurs bénévoles</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Base fixe : chaque bénévole garde son numéro d&apos;une édition à l&apos;autre. Créé ici, il sera
        automatiquement présent (même sans article) à chaque nouvelle édition.
      </p>

      <div className="mt-6">
        <BenevoleForm />
      </div>

      <ul className="mt-8 divide-y divide-zinc-200 rounded-md border border-zinc-200">
        {benevoles.map((b) => {
          const special = estVendeurSpecial(b.numero_fixe);
          return (
            <li key={b.numero_fixe} className="flex items-center justify-between px-4 py-3 text-sm">
              <span>
                <span className="font-mono text-zinc-500">#{b.numero_fixe}</span>{" "}
                <span className="font-medium">{b.nom}</span>
                {special && (
                  <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500">système</span>
                )}
              </span>
              {!special && (
                <span className="text-zinc-500">
                  {b.telephone || "—"} · {b.email || "—"}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
