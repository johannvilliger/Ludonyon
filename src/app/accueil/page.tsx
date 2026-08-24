import Link from "next/link";
import { redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";

type ResultatRecherche = {
  numero_vendeur: number;
  code_confirmation: string;
  statut: string;
  est_benevole: number;
  nom_vendeur: string;
};

const STATUT_LABELS: Record<string, string> = {
  liste_soumise: "Liste soumise",
  controlee: "Contrôlée",
  cloturee: "Clôturée",
};

export default async function AccueilPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const terme = (q ?? "").trim();

  let resultats: ResultatRecherche[] = [];
  let editionOuverte = true;

  if (terme) {
    const edition = await queryOne<{ id: string }>("SELECT id FROM editions WHERE active_flag = 1 LIMIT 1");

    if (!edition) {
      editionOuverte = false;
    } else {
      const parCode = await queryOne<{ code_confirmation: string }>(
        "SELECT code_confirmation FROM participations WHERE edition_id = ? AND code_confirmation = ?",
        [edition.id, terme],
      );

      if (parCode) {
        redirect(`/accueil/vendeur/${parCode.code_confirmation}`);
      }

      resultats = await query<ResultatRecherche>(
        `SELECT p.numero_vendeur, p.code_confirmation, p.statut, p.est_benevole, v.nom AS nom_vendeur
         FROM participations p
         JOIN vendeurs v ON v.id = p.vendeur_id
         WHERE p.edition_id = ? AND v.nom LIKE CONCAT('%', ?, '%')
         ORDER BY p.numero_vendeur`,
        [edition.id, terme],
      );
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Accueil</h1>
          <p className="mt-2 text-zinc-600">
            Retrouve la liste d&apos;un vendeur par son code de confirmation ou son nom.
          </p>
        </div>
        <Link
          href="/accueil/nouveau"
          className="shrink-0 rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:border-zinc-400"
        >
          + Liste sur place
        </Link>
      </div>

      <form action="/accueil" method="get" className="mt-6 flex gap-2">
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

      {terme && !editionOuverte && (
        <p className="mt-6 text-sm text-red-600">Aucune édition active actuellement.</p>
      )}

      {terme && editionOuverte && resultats.length === 0 && (
        <p className="mt-6 text-sm text-zinc-500">Aucun résultat pour « {terme} ».</p>
      )}

      {resultats.length > 0 && (
        <ul className="mt-6 divide-y divide-zinc-200 rounded-md border border-zinc-200">
          {resultats.map((r) => (
            <li key={r.code_confirmation}>
              <Link
                href={`/accueil/vendeur/${r.code_confirmation}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50"
              >
                <span>
                  <span className="font-mono text-sm text-zinc-500">#{r.numero_vendeur}</span>{" "}
                  <span className="font-medium">{r.nom_vendeur}</span>
                  {r.est_benevole ? (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                      bénévole
                    </span>
                  ) : null}
                </span>
                <span className="text-sm text-zinc-500">{STATUT_LABELS[r.statut] ?? r.statut}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
