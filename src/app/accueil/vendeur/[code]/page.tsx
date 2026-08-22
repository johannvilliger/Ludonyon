import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { definirBenevole, marquerControlee } from "./actions";

type Article = { numero_article: number; nom: string; prix: number; statut: string };
type Vendeur = { nom: string; telephone: string | null; email: string | null };
type Participation = {
  numero_vendeur: number;
  code_confirmation: string;
  statut: string;
  est_benevole: boolean;
  vendeurs: Vendeur;
  articles: Article[];
};

const STATUT_LABELS: Record<string, string> = {
  liste_soumise: "Liste soumise",
  controlee: "Contrôlée",
  cloturee: "Clôturée",
};

export default async function VendeurAccueilPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = createServiceClient();

  const { data: participation } = await supabase
    .from("participations")
    .select(
      "numero_vendeur, code_confirmation, statut, est_benevole, vendeurs(nom, telephone, email), articles(numero_article, nom, prix, statut)",
    )
    .eq("code_confirmation", code)
    .single<Participation>();

  if (!participation) notFound();

  const articles = [...participation.articles].sort(
    (a, b) => a.numero_article - b.numero_article,
  );
  const total = articles.reduce((sum, a) => sum + a.prix, 0);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/accueil" className="text-sm text-zinc-500 hover:underline">
        ← Recherche
      </Link>

      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {participation.vendeurs.nom} — n° {participation.numero_vendeur}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {participation.vendeurs.telephone || "—"} · {participation.vendeurs.email || "—"}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
          {STATUT_LABELS[participation.statut] ?? participation.statut}
        </span>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <form action={definirBenevole.bind(null, code, !participation.est_benevole)}>
          <button
            type="submit"
            className={
              participation.est_benevole
                ? "rounded-md bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-200"
                : "rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:border-zinc-400"
            }
          >
            {participation.est_benevole ? "✓ Vendeur bénévole" : "Marquer comme bénévole"}
          </button>
        </form>

        <Link
          href={`/accueil/vendeur/${code}/etiquettes`}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:border-zinc-400"
        >
          Imprimer les étiquettes
        </Link>

        {participation.statut !== "controlee" && (
          <form action={marquerControlee.bind(null, code)}>
            <button
              type="submit"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Marquer comme contrôlée
            </button>
          </form>
        )}
      </div>

      <h2 className="mt-8 text-lg font-medium">
        {articles.length} article{articles.length > 1 ? "s" : ""} · {total} CHF
      </h2>
      <ul className="mt-3 divide-y divide-zinc-200">
        {articles.map((a) => (
          <li key={a.numero_article} className="flex justify-between py-2 text-sm">
            <span>
              {String(a.numero_article).padStart(2, "0")} — {a.nom}
            </span>
            <span className="font-mono">{a.prix}.–</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
