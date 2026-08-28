import { redirect } from "next/navigation";
import Link from "next/link";
import { formaterMontant } from "@/lib/argent";
import { query } from "@/lib/db";
import { dashboardEstConnecte } from "@/lib/gestion";
import { RenvoyerQuittanceButton } from "./renvoyer-quittance-button";

export const dynamic = "force-dynamic";

type QuittanceLigne = {
  id: string;
  email: string;
  statut: "en_attente" | "envoyee" | "echec";
  created_at: string;
  envoyee_le: string | null;
  numero_caisse: number;
  annee: number;
  total: number;
  nb_articles: number;
};

const LABELS_STATUT: Record<QuittanceLigne["statut"], string> = {
  en_attente: "En attente",
  envoyee: "Envoyée",
  echec: "Échec",
};
const STYLES_STATUT: Record<QuittanceLigne["statut"], string> = {
  en_attente: "bg-amber-100 text-amber-800",
  envoyee: "bg-emerald-100 text-emerald-800",
  echec: "bg-red-100 text-red-800",
};

export default async function QuittancesPage() {
  if (!(await dashboardEstConnecte())) redirect("/gestion");

  const quittances = await query<QuittanceLigne>(
    `SELECT
       q.id,
       q.email,
       q.statut,
       q.created_at,
       q.envoyee_le,
       pc.numero AS numero_caisse,
       e.annee,
       COALESCE(SUM(va.prix_encaisse), 0) AS total,
       COUNT(va.id) AS nb_articles
     FROM quittances q
     JOIN ventes v ON v.id = q.vente_id
     JOIN caisses c ON c.id = v.caisse_id
     JOIN postes_caisse pc ON pc.id = c.poste_caisse_id
     JOIN editions e ON e.id = v.edition_id
     LEFT JOIN vente_articles va ON va.vente_id = v.id
     GROUP BY q.id, q.email, q.statut, q.created_at, q.envoyee_le, pc.numero, e.annee
     ORDER BY q.created_at DESC`,
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link href="/gestion/dashboard" className="text-sm text-zinc-500 hover:underline">
        ← Dashboard
      </Link>

      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Quittances</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Historique des quittances par email demandées à l&apos;encaissement. L&apos;envoi est différé
        jusqu&apos;à la vente suivante sur la même caisse (ou sa clôture) — jamais immédiat, pour ne
        jamais envoyer un ticket pour une vente qui finit par être annulée.
      </p>

      {quittances.length === 0 && <p className="mt-6 text-sm text-zinc-500">Aucune quittance pour le moment.</p>}

      <ul className="mt-6 divide-y divide-zinc-200 rounded-md border border-zinc-200">
        {quittances.map((q) => (
          <li key={q.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
            <span>
              <span className="font-medium">{q.email}</span>
              <span className="ml-2 text-xs text-zinc-500">
                Édition {q.annee} · Caisse {q.numero_caisse} · {q.nb_articles} article
                {q.nb_articles > 1 ? "s" : ""} · {formaterMontant(Number(q.total))}
              </span>
              <span className="block text-xs text-zinc-400">
                Vente : {new Date(q.created_at.replace(" ", "T")).toLocaleString("fr-CH")}
                {q.envoyee_le && ` · Envoyée : ${new Date(q.envoyee_le.replace(" ", "T")).toLocaleString("fr-CH")}`}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES_STATUT[q.statut]}`}>
                {LABELS_STATUT[q.statut]}
              </span>
              {q.statut !== "envoyee" && <RenvoyerQuittanceButton quittanceId={q.id} />}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
