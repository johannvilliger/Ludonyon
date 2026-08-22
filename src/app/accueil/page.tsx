import Link from "next/link";
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";

type ResultatRecherche = {
  numero_vendeur: number;
  code_confirmation: string;
  statut: string;
  est_benevole: boolean;
  vendeurs: { nom: string };
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
    const supabase = createServiceClient();

    const { data: edition } = await supabase
      .from("editions")
      .select("id")
      .eq("statut", "ouverte")
      .single();

    if (!edition) {
      editionOuverte = false;
    } else {
      const { data: parCode } = await supabase
        .from("participations")
        .select("code_confirmation")
        .eq("edition_id", edition.id)
        .eq("code_confirmation", terme)
        .maybeSingle();

      if (parCode) {
        redirect(`/accueil/vendeur/${parCode.code_confirmation}`);
      }

      const { data: vendeursMatch } = await supabase
        .from("vendeurs")
        .select("id")
        .ilike("nom", `%${terme}%`);

      const vendeurIds = (vendeursMatch ?? []).map((v) => v.id);

      if (vendeurIds.length > 0) {
        const { data } = await supabase
          .from("participations")
          .select("numero_vendeur, code_confirmation, statut, est_benevole, vendeurs(nom)")
          .eq("edition_id", edition.id)
          .in("vendeur_id", vendeurIds)
          .order("numero_vendeur")
          .returns<ResultatRecherche[]>();

        resultats = data ?? [];
      }
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
        <p className="mt-6 text-sm text-red-600">Aucune édition n&apos;est ouverte actuellement.</p>
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
                  <span className="font-medium">{r.vendeurs.nom}</span>
                  {r.est_benevole && (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                      bénévole
                    </span>
                  )}
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
