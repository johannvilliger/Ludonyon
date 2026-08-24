import { redirect } from "next/navigation";
import Link from "next/link";
import { query, queryOne } from "@/lib/db";
import { dashboardEstConnecte } from "@/lib/gestion";
import { estVendeurSpecial } from "@/lib/vendeurs-speciaux";
import { BenevoleForm } from "./benevole-form";

export const dynamic = "force-dynamic";

type BenevoleLigne = {
  numero_fixe: number;
  nom: string;
  telephone: string | null;
  email: string | null;
  code_confirmation: string | null;
};

export default async function BenevolesPage() {
  if (!(await dashboardEstConnecte())) redirect("/gestion");

  const edition = await queryOne<{ id: string }>("SELECT id FROM editions WHERE active_flag = 1");

  const benevoles = await query<BenevoleLigne>(
    `SELECT b.numero_fixe, v.nom, v.telephone, v.email, p.code_confirmation
     FROM benevoles b
     JOIN vendeurs v ON v.id = b.vendeur_id
     LEFT JOIN participations p ON p.vendeur_id = b.vendeur_id AND p.edition_id = ?
     ORDER BY b.numero_fixe`,
    [edition?.id ?? null],
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
      {!edition && (
        <p className="mt-2 text-sm text-amber-700">
          Aucune édition active — les listes d&apos;articles ne sont accessibles qu&apos;une fois une édition lancée.
        </p>
      )}

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
              <span className="flex items-center gap-3">
                {!special && (
                  <span className="text-zinc-500">
                    {b.telephone || "—"} · {b.email || "—"}
                  </span>
                )}
                {b.code_confirmation && (
                  <Link
                    href={`/accueil/vendeur/${b.code_confirmation}`}
                    className="rounded border border-zinc-300 px-2 py-1 text-xs font-normal hover:border-zinc-400"
                  >
                    Voir sa liste →
                  </Link>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
