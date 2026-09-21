import Link from "next/link";
import { redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { ScanEnveloppeButton } from "./scan-enveloppe-button";

type VendeurLigne = {
  numero_vendeur: number;
  code_confirmation: string;
  nom_vendeur: string;
  enveloppe_recuperee_le: string | null;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
function formaterDateHeure(iso: string): string {
  const d = new Date(iso);
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)} à ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export default async function EnveloppesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const terme = (q ?? "").trim();

  const edition = await queryOne<{ id: string }>("SELECT id FROM editions WHERE active_flag = 1 LIMIT 1");

  if (terme && edition) {
    const parCode = await queryOne<{ code_confirmation: string }>(
      "SELECT code_confirmation FROM participations WHERE edition_id = ? AND code_confirmation = ?",
      [edition.id, terme],
    );
    if (parCode) redirect(`/accueil/enveloppes/${parCode.code_confirmation}`);
  }

  // Sans recherche (le cas normal en arrivant sur la page) : toute la liste
  // pour le suivi — qui a déjà récupéré son enveloppe ou non. Avec
  // recherche par nom : mêmes colonnes, juste filtrées.
  const vendeurs = edition
    ? await query<VendeurLigne>(
        `SELECT p.numero_vendeur, p.code_confirmation, v.nom AS nom_vendeur, p.enveloppe_recuperee_le
         FROM participations p
         JOIN vendeurs v ON v.id = p.vendeur_id
         WHERE p.edition_id = ? ${terme ? "AND v.nom LIKE CONCAT('%', ?, '%')" : ""}
         ORDER BY p.enveloppe_recuperee_le IS NOT NULL, v.nom`,
        terme ? [edition.id, terme] : [edition.id],
      )
    : [];

  const nbRecuperees = vendeurs.filter((v) => v.enveloppe_recuperee_le).length;

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/accueil" className="text-sm text-zinc-500 hover:underline">
            ← Accueil
          </Link>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Récupération des enveloppes</h1>
          <p className="mt-2 text-zinc-600">
            Retrouve un vendeur par son nom ou son code, fais-le signer à la remise de son enveloppe.
          </p>
        </div>
      </div>

      {!edition && <p className="mt-6 text-sm text-red-600">Aucune édition active actuellement.</p>}

      {edition && (
        <>
          <form action="/accueil/enveloppes" method="get" className="mt-6 flex gap-2">
            <input
              name="q"
              defaultValue={terme}
              placeholder="Nom ou code de confirmation"
              className="flex-1 rounded-md border border-zinc-300 px-3 py-2"
            />
            <button
              type="submit"
              className="rounded-md bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-800"
            >
              Rechercher
            </button>
          </form>

          <div className="mt-3">
            <ScanEnveloppeButton />
          </div>

          <p className="mt-6 text-sm text-zinc-500">
            {nbRecuperees} / {vendeurs.length} enveloppe{vendeurs.length > 1 ? "s" : ""} récupérée
            {nbRecuperees > 1 ? "s" : ""}
          </p>

          {terme && vendeurs.length === 0 && (
            <p className="mt-3 text-sm text-zinc-500">Aucun résultat pour « {terme} ».</p>
          )}

          {vendeurs.length > 0 && (
            <ul className="mt-3 divide-y divide-zinc-200 rounded-md border border-zinc-200">
              {vendeurs.map((v) => (
                <li key={v.code_confirmation}>
                  <Link
                    href={`/accueil/enveloppes/${v.code_confirmation}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50"
                  >
                    <span>
                      <span className="font-mono text-sm text-zinc-500">#{v.numero_vendeur}</span>{" "}
                      <span className="font-medium">{v.nom_vendeur}</span>
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        v.enveloppe_recuperee_le
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {v.enveloppe_recuperee_le
                        ? `Récupérée le ${formaterDateHeure(v.enveloppe_recuperee_le)}`
                        : "Pas encore récupérée"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
