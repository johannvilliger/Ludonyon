import { redirect } from "next/navigation";
import Link from "next/link";
import { query, queryOne } from "@/lib/db";
import { dashboardEstConnecte } from "@/lib/gestion";
import { MarquerAbsentButton, MarquerTousAbsentsButton } from "./absent-buttons";

export const dynamic = "force-dynamic";

type Edition = { id: string };
type VendeurLigne = {
  participation_id: string;
  numero_vendeur: number;
  nom_vendeur: string;
  telephone: string | null;
};

export default async function AbsentsDashboardPage() {
  if (!(await dashboardEstConnecte())) redirect("/gestion");

  const edition = await queryOne<Edition>("SELECT id FROM editions WHERE active_flag = 1");

  const enAttente = edition
    ? await query<VendeurLigne>(
        `SELECT p.id AS participation_id, p.numero_vendeur, v.nom AS nom_vendeur, v.telephone
         FROM participations p
         JOIN vendeurs v ON v.id = p.vendeur_id
         WHERE p.edition_id = ? AND p.statut = 'liste_soumise' AND p.absent = 0
         ORDER BY p.numero_vendeur`,
        [edition.id],
      )
    : [];

  const absents = edition
    ? await query<VendeurLigne>(
        `SELECT p.id AS participation_id, p.numero_vendeur, v.nom AS nom_vendeur, v.telephone
         FROM participations p
         JOIN vendeurs v ON v.id = p.vendeur_id
         WHERE p.edition_id = ? AND p.absent = 1
         ORDER BY p.numero_vendeur`,
        [edition.id],
      )
    : [];

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <Link href="/gestion/dashboard" className="text-sm text-zinc-500 hover:underline">
        ← Dashboard
      </Link>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Vendeurs non venus</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Vendeurs dont la liste n&apos;a jamais été contrôlée à l&apos;accueil. Les marquer absents les sort
        des statistiques de réception (vendeurs venus, articles en attente/total) sans supprimer leur
        liste ni leurs articles — réversible à tout moment.
      </p>

      {!edition && <p className="mt-6 text-sm text-zinc-500">Aucune édition active.</p>}

      {edition && enAttente.length === 0 && (
        <p className="mt-6 text-sm text-zinc-500">
          Aucun vendeur en attente — tout le monde est passé par l&apos;accueil.
        </p>
      )}

      {edition && enAttente.length > 0 && (
        <>
          <div className="mt-6 flex items-center justify-between">
            <h2 className="text-lg font-medium">En attente ({enAttente.length})</h2>
            <MarquerTousAbsentsButton nb={enAttente.length} />
          </div>
          <ul className="mt-3 divide-y divide-zinc-200 rounded-md border border-zinc-200">
            {enAttente.map((v) => (
              <li key={v.participation_id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>
                  <span className="font-mono text-zinc-500">#{v.numero_vendeur}</span>{" "}
                  <span className="font-medium">{v.nom_vendeur}</span>
                  <span className="block text-xs text-zinc-500">{v.telephone || "—"}</span>
                </span>
                <MarquerAbsentButton participationId={v.participation_id} absent />
              </li>
            ))}
          </ul>
        </>
      )}

      {edition && absents.length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-medium">Marqués absents ({absents.length})</h2>
          <ul className="mt-3 divide-y divide-zinc-200 rounded-md border border-zinc-200">
            {absents.map((v) => (
              <li key={v.participation_id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>
                  <span className="font-mono text-zinc-500">#{v.numero_vendeur}</span>{" "}
                  <span className="font-medium">{v.nom_vendeur}</span>
                </span>
                <MarquerAbsentButton participationId={v.participation_id} absent={false} />
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
