import { redirect } from "next/navigation";
import Link from "next/link";
import { query, queryOne } from "@/lib/db";
import { dashboardEstConnecte } from "@/lib/gestion";

export const dynamic = "force-dynamic";

type Edition = { id: string; annee: number };

type ArticleResultat = {
  participation_id: string;
  numero_vendeur: number;
  nom_vendeur: string;
  telephone: string | null;
  email: string | null;
  numero_article: number;
  nom: string;
  prix: number;
  statut: string;
};

const STATUT_LABELS: Record<string, string> = {
  non_recu: "Non reçu",
  recu: "Reçu",
  vendu: "Vendu",
  invendu: "Invendu",
  refuse: "Refusé",
};

const STATUT_STYLES: Record<string, string> = {
  non_recu: "bg-zinc-100 text-zinc-600",
  recu: "bg-emerald-100 text-emerald-800",
  vendu: "bg-blue-100 text-blue-800",
  invendu: "bg-amber-100 text-amber-800",
  refuse: "bg-red-100 text-red-800",
};

const FILTRES_STATUT = [
  { valeur: "tous", label: "Tous" },
  { valeur: "vendu", label: "Vendus" },
  { valeur: "non_vendu", label: "Invendus / en attente de vente" },
] as const;
type FiltreStatut = (typeof FILTRES_STATUT)[number]["valeur"];

export default async function ArticlesDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ nom?: string; statut?: string }>;
}) {
  if (!(await dashboardEstConnecte())) redirect("/gestion");

  const params = await searchParams;
  const nom = (params.nom ?? "").trim();
  const statut: FiltreStatut = FILTRES_STATUT.some((f) => f.valeur === params.statut)
    ? (params.statut as FiltreStatut)
    : "tous";

  const edition = await queryOne<Edition>("SELECT id, annee FROM editions WHERE active_flag = 1");

  const rechercheLancee = Boolean(nom) || statut !== "tous";

  let resultats: ArticleResultat[] = [];
  if (edition && rechercheLancee) {
    const conditions = ["p.edition_id = ?"];
    const valeurs: (string | number)[] = [edition.id];

    if (nom) {
      conditions.push("a.nom LIKE CONCAT('%', ?, '%')");
      valeurs.push(nom);
    }
    if (statut === "vendu") {
      conditions.push("a.statut = 'vendu'");
    } else if (statut === "non_vendu") {
      conditions.push("a.statut IN ('non_recu', 'recu', 'invendu')");
    }

    resultats = await query<ArticleResultat>(
      `SELECT p.id AS participation_id, p.numero_vendeur, v.nom AS nom_vendeur, v.telephone, v.email,
              a.numero_article, a.nom, a.prix, a.statut
       FROM articles a
       JOIN participations p ON p.id = a.participation_id
       JOIN vendeurs v ON v.id = p.vendeur_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY p.numero_vendeur, a.numero_article`,
      valeurs,
    );
  }

  const articlesParVendeur = new Map<string, ArticleResultat[]>();
  for (const a of resultats) {
    const liste = articlesParVendeur.get(a.participation_id) ?? [];
    liste.push(a);
    articlesParVendeur.set(a.participation_id, liste);
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link href="/gestion/dashboard" className="text-sm text-zinc-500 hover:underline">
        ← Dashboard
      </Link>

      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Articles</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Recherche un article par son nom parmi tous les vendeurs de l&apos;édition en cours.
      </p>

      {!edition && <p className="mt-6 text-sm text-zinc-500">Aucune édition active.</p>}

      {edition && (
        <form action="/gestion/dashboard/articles" method="get" className="mt-6 flex flex-wrap gap-2">
          <input
            name="nom"
            defaultValue={nom}
            placeholder="Nom de l'article"
            className="min-w-[200px] flex-1 rounded-md border border-zinc-300 px-3 py-2"
          />
          <select
            name="statut"
            defaultValue={statut}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
          >
            {FILTRES_STATUT.map((f) => (
              <option key={f.valeur} value={f.valeur}>
                {f.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-800"
          >
            Rechercher
          </button>
        </form>
      )}

      {edition && !rechercheLancee && (
        <p className="mt-6 text-sm text-zinc-500">
          Entre un nom d&apos;article, ou choisis un filtre, pour lancer la recherche.
        </p>
      )}

      {edition && rechercheLancee && resultats.length === 0 && (
        <p className="mt-6 text-sm text-zinc-500">Aucun article ne correspond à cette recherche.</p>
      )}

      {resultats.length > 0 && (
        <div className="mt-6 space-y-4">
          {[...articlesParVendeur.entries()].map(([participationId, liste]) => {
            const { numero_vendeur, nom_vendeur, telephone, email } = liste[0];
            return (
              <div key={participationId} className="rounded-md border border-zinc-200 p-4">
                <p className="text-sm font-medium">
                  Vendeur #{numero_vendeur} — {nom_vendeur}
                  <span className="block text-xs font-normal text-zinc-500">
                    {telephone || "—"}
                    {email && ` · ${email}`}
                  </span>
                </p>
                <ul className="mt-3 divide-y divide-zinc-200">
                  {liste.map((a) => (
                    <li key={a.numero_article} className="flex items-center justify-between py-2 text-sm">
                      <span>
                        {String(a.numero_article).padStart(2, "0")} — {a.nom}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{a.prix}.–</span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUT_STYLES[a.statut] ?? "bg-zinc-100 text-zinc-600"}`}
                        >
                          {STATUT_LABELS[a.statut] ?? a.statut}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
