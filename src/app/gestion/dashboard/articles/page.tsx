import { redirect } from "next/navigation";
import Link from "next/link";
import { query, queryOne } from "@/lib/db";
import { dashboardEstConnecte } from "@/lib/gestion";
import { CATEGORIES_ARTICLES } from "@/lib/categories";
import { CategorieSelect } from "./categorie-select";

export const dynamic = "force-dynamic";

type Edition = { id: string; annee: number };

type ArticleResultat = {
  id: string;
  participation_id: string;
  numero_vendeur: number;
  nom_vendeur: string;
  telephone: string | null;
  email: string | null;
  numero_article: number;
  nom: string;
  prix: number;
  statut: string;
  categorie: string | null;
};

// Sentinelle pour les articles sans catégorie (categorie_id IS NULL) — une
// valeur qui ne peut pas être confondue avec un vrai nom de catégorie ni
// avec "paramètre absent" (voir categorieFiltre).
const SANS_CATEGORIE = "aucune";

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
  searchParams: Promise<{ nom?: string; statut?: string; categorie?: string }>;
}) {
  if (!(await dashboardEstConnecte())) redirect("/gestion");

  const params = await searchParams;
  const nom = (params.nom ?? "").trim();
  const statut: FiltreStatut = FILTRES_STATUT.some((f) => f.valeur === params.statut)
    ? (params.statut as FiltreStatut)
    : "tous";
  // undefined = pas de filtre catégorie ; SANS_CATEGORIE = articles non
  // classés ; sinon un nom de CATEGORIES_ARTICLES.
  const categorieFiltre: string | undefined =
    params.categorie === SANS_CATEGORIE || (CATEGORIES_ARTICLES as readonly string[]).includes(params.categorie ?? "")
      ? (params.categorie ?? SANS_CATEGORIE)
      : undefined;

  const edition = await queryOne<Edition>("SELECT id, annee FROM editions WHERE active_flag = 1");

  // Aperçu toujours affiché (pas besoin d'avoir lancé une recherche) : combien
  // d'articles dans chaque catégorie, pour repérer en un coup d'œil ce qui
  // reste à reclasser.
  const repartition = edition
    ? await query<{ categorie: string | null; total: number }>(
        `SELECT c.nom AS categorie, COUNT(*) AS total
         FROM articles a
         JOIN participations p ON p.id = a.participation_id
         LEFT JOIN categories c ON c.id = a.categorie_id
         WHERE p.edition_id = ?
         GROUP BY c.nom`,
        [edition.id],
      )
    : [];
  const totalParCategorie = new Map(repartition.map((r) => [r.categorie ?? SANS_CATEGORIE, r.total]));

  const rechercheLancee = Boolean(nom) || statut !== "tous" || categorieFiltre !== undefined;

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
    if (categorieFiltre === SANS_CATEGORIE) {
      conditions.push("a.categorie_id IS NULL");
    } else if (categorieFiltre) {
      conditions.push("c.nom = ?");
      valeurs.push(categorieFiltre);
    }

    resultats = await query<ArticleResultat>(
      `SELECT a.id, p.id AS participation_id, p.numero_vendeur, v.nom AS nom_vendeur, v.telephone, v.email,
              a.numero_article, a.nom, a.prix, a.statut, c.nom AS categorie
       FROM articles a
       JOIN participations p ON p.id = a.participation_id
       JOIN vendeurs v ON v.id = p.vendeur_id
       LEFT JOIN categories c ON c.id = a.categorie_id
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
        Recherche un article par son nom, ou clique une catégorie ci-dessous, parmi tous les vendeurs de
        l&apos;édition en cours. La catégorie de chaque résultat peut être corrigée directement dans la liste.
      </p>

      {!edition && <p className="mt-6 text-sm text-zinc-500">Aucune édition active.</p>}

      {edition && (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Répartition par catégorie</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[...CATEGORIES_ARTICLES, SANS_CATEGORIE].map((c) => {
              const total = totalParCategorie.get(c) ?? 0;
              const label = c === SANS_CATEGORIE ? "Sans catégorie" : c;
              const actif = categorieFiltre === c;
              const params = new URLSearchParams();
              if (nom) params.set("nom", nom);
              if (statut !== "tous") params.set("statut", statut);
              if (!actif) params.set("categorie", c);
              return (
                <Link
                  key={label}
                  href={`/gestion/dashboard/articles?${params.toString()}`}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    actif
                      ? "bg-zinc-900 text-white"
                      : total === 0
                        ? "bg-zinc-50 text-zinc-400"
                        : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                  }`}
                >
                  {label} · {total}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {edition && (
        <form action="/gestion/dashboard/articles" method="get" className="mt-6 flex flex-wrap gap-2">
          {categorieFiltre !== undefined && <input type="hidden" name="categorie" value={categorieFiltre} />}
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
                        <CategorieSelect articleId={a.id} categorie={a.categorie} />
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
