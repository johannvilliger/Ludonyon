import { createServiceClient } from "@/lib/supabase/server";
import { VidageForm } from "./vidage-form";

type Edition = { id: string; annee: number; taux_vendeur: number };
type Caisse = { id: string; nom: string; fond_initial: number };
type VenteArticleRow = {
  prix_encaisse: number;
  ventes: { caisse_id: string };
  articles: { prix: number; participations: { est_benevole: boolean } };
};
type MouvementRow = { caisse_id: string; montant: number };

export default async function DashboardPage() {
  const supabase = createServiceClient();

  const { data: edition } = await supabase
    .from("editions")
    .select("id, annee, taux_vendeur")
    .eq("statut", "ouverte")
    .single<Edition>();

  if (!edition) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-4 text-sm text-red-600">Aucune édition n&apos;est ouverte actuellement.</p>
      </main>
    );
  }

  const { data: caisses } = await supabase
    .from("caisses")
    .select("id, nom, fond_initial")
    .eq("edition_id", edition.id)
    .order("nom")
    .returns<Caisse[]>();

  const { data: ventesArticles } = await supabase
    .from("vente_articles")
    .select("prix_encaisse, ventes!inner(caisse_id, edition_id), articles!inner(prix, participations!inner(est_benevole))")
    .eq("ventes.edition_id", edition.id)
    .returns<VenteArticleRow[]>();

  const caisseIds = (caisses ?? []).map((c) => c.id);
  const { data: mouvements } =
    caisseIds.length > 0
      ? await supabase
          .from("mouvements_caisse")
          .select("caisse_id, montant")
          .in("caisse_id", caisseIds)
          .returns<MouvementRow[]>()
      : { data: [] as MouvementRow[] };

  let totalEncaisse = 0;
  let totalDuVendeurs = 0;
  const ventesParCaisse: Record<string, number> = {};

  for (const row of ventesArticles ?? []) {
    totalEncaisse += row.prix_encaisse;
    const partVendeur = row.articles.participations.est_benevole
      ? row.articles.prix
      : Math.round(row.articles.prix * (1 - edition.taux_vendeur));
    totalDuVendeurs += partVendeur;
    ventesParCaisse[row.ventes.caisse_id] = (ventesParCaisse[row.ventes.caisse_id] ?? 0) + row.prix_encaisse;
  }

  const vidagesParCaisse: Record<string, number> = {};
  for (const m of mouvements ?? []) {
    vidagesParCaisse[m.caisse_id] = (vidagesParCaisse[m.caisse_id] ?? 0) + m.montant;
  }

  const benefice = totalEncaisse - totalDuVendeurs;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Dashboard — édition {edition.annee}</h1>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-md border border-zinc-200 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Encaissé</p>
          <p className="mt-1 text-2xl font-semibold">{totalEncaisse}.–</p>
        </div>
        <div className="rounded-md border border-zinc-200 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Dû aux vendeurs</p>
          <p className="mt-1 text-2xl font-semibold">{totalDuVendeurs}.–</p>
        </div>
        <div className="rounded-md border border-zinc-200 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Bénéfice</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700">{benefice}.–</p>
        </div>
      </div>

      <h2 className="mt-8 text-lg font-medium">Caisses</h2>
      {(!caisses || caisses.length === 0) && (
        <p className="mt-3 text-sm text-zinc-500">Aucune caisse ouverte pour l&apos;instant.</p>
      )}
      <ul className="mt-3 space-y-3">
        {(caisses ?? []).map((c) => {
          const ventes = ventesParCaisse[c.id] ?? 0;
          const vidages = vidagesParCaisse[c.id] ?? 0;
          const cashEnCaisse = c.fond_initial + ventes - vidages;
          return (
            <li key={c.id} className="rounded-md border border-zinc-200 p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">{c.nom}</span>
                <span className="text-sm text-zinc-500">Ventes : {ventes}.–</span>
              </div>
              <p className="mt-1 text-sm text-zinc-600">
                Cash en caisse : <span className="font-mono">{cashEnCaisse}.–</span>
                <span className="text-zinc-400"> (fonds {c.fond_initial}.– − vidages {vidages}.–)</span>
              </p>
              <VidageForm caisseId={c.id} />
            </li>
          );
        })}
      </ul>
    </main>
  );
}
