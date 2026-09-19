import { redirect } from "next/navigation";
import Link from "next/link";
import { query, queryOne } from "@/lib/db";
import { dashboardEstConnecte } from "@/lib/gestion";
import { calculerDiffImpression, type ArticleSimple } from "@/lib/articles-diff";
import { ClasserButton } from "./classer-button";

export const dynamic = "force-dynamic";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formaterDateHeure(iso: string): string {
  const d = new Date(iso);
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)} à ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

type Edition = { id: string; annee: number };
type VendeurLigne = {
  participation_id: string;
  numero_vendeur: number;
  nom_vendeur: string;
  telephone: string | null;
  email: string | null;
  est_benevole: number;
  articles_imprimes_json: string | null;
  imprimee_le: string | null;
};
type ArticleLigne = {
  participation_id: string;
  numero_article: number;
  nom: string;
  prix: number;
  statut: string;
  categorie: string | null;
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

export default async function VendeursDashboardPage() {
  if (!(await dashboardEstConnecte())) redirect("/gestion");

  const edition = await queryOne<Edition>("SELECT id, annee FROM editions WHERE active_flag = 1");

  const vendeurs = edition
    ? await query<VendeurLigne>(
        `SELECT p.id AS participation_id, p.numero_vendeur, v.nom AS nom_vendeur, v.telephone, v.email,
                p.est_benevole, p.articles_imprimes_json, p.imprimee_le
         FROM participations p
         JOIN vendeurs v ON v.id = p.vendeur_id
         WHERE p.edition_id = ?
         ORDER BY p.numero_vendeur`,
        [edition.id],
      )
    : [];

  const articles = edition
    ? await query<ArticleLigne>(
        `SELECT a.participation_id, a.numero_article, a.nom, a.prix, a.statut, c.nom AS categorie
         FROM articles a
         JOIN participations p ON p.id = a.participation_id
         LEFT JOIN categories c ON c.id = a.categorie_id
         WHERE p.edition_id = ?
         ORDER BY a.numero_article`,
        [edition.id],
      )
    : [];

  const articlesParVendeur = new Map<string, ArticleLigne[]>();
  for (const a of articles) {
    const liste = articlesParVendeur.get(a.participation_id) ?? [];
    liste.push(a);
    articlesParVendeur.set(a.participation_id, liste);
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <Link href="/gestion/dashboard" className="text-sm text-zinc-500 hover:underline">
        ← Dashboard
      </Link>

      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Vendeurs</h1>

      {!edition && <p className="mt-6 text-sm text-zinc-500">Aucune édition active.</p>}

      {edition && (
        <div className="mt-4">
          <ClasserButton />
        </div>
      )}

      {edition && vendeurs.length === 0 && (
        <p className="mt-6 text-sm text-zinc-500">Aucun vendeur pour cette édition.</p>
      )}

      <div className="mt-6 space-y-4">
        {vendeurs.map((v) => {
          const liste = articlesParVendeur.get(v.participation_id) ?? [];
          const total = liste.reduce((sum, a) => sum + a.prix, 0);

          const imprimes: ArticleSimple[] | null = v.articles_imprimes_json
            ? JSON.parse(v.articles_imprimes_json)
            : null;
          const diff = calculerDiffImpression(
            imprimes,
            liste.map((a) => ({ nom: a.nom, prix: a.prix })),
          );
          const diffParNom = new Map((diff?.lignes ?? []).map((l) => [l.nom.trim().toLowerCase(), l]));
          const lignesSupprimees = diff?.lignes.filter((l) => l.type === "supprime") ?? [];

          const badgeImpression = !v.imprimee_le
            ? { texte: "Jamais imprimée", style: "bg-zinc-100 text-zinc-500" }
            : diff?.modifiee
              ? { texte: "Modifiée depuis impression", style: "bg-red-100 text-red-700" }
              : { texte: `Imprimée le ${formaterDateHeure(v.imprimee_le)}`, style: "bg-emerald-100 text-emerald-800" };

          return (
            <details key={v.participation_id} className="rounded-md border border-zinc-200 p-4">
              <summary className="flex cursor-pointer items-center justify-between text-sm font-medium">
                <span>
                  Vendeur #{v.numero_vendeur} — {v.nom_vendeur}
                  {Boolean(v.est_benevole) && <span className="ml-2 text-xs text-amber-700">(bénévole)</span>}
                  <span className="block text-xs font-normal text-zinc-500">
                    {v.telephone || "—"}
                    {v.email && ` · ${v.email}`}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeImpression.style}`}>
                    {badgeImpression.texte}
                  </span>
                  <span className="text-zinc-500">
                    {liste.length} article{liste.length > 1 ? "s" : ""} · {total}.–
                  </span>
                  <Link
                    href={`/gestion/dashboard/vendeurs/${v.participation_id}/imprimer`}
                    className="rounded border border-zinc-300 px-2 py-1 text-xs font-normal hover:border-zinc-400"
                  >
                    Imprimer
                  </Link>
                </span>
              </summary>
              <ul className="mt-3 divide-y divide-zinc-200">
                {liste.map((a) => {
                  const ligneDiff = diffParNom.get(a.nom.trim().toLowerCase());
                  return (
                    <li key={a.numero_article} className="flex items-center justify-between py-2 text-sm">
                      <span>
                        {String(a.numero_article).padStart(2, "0")} — {a.nom}
                        {a.categorie && (
                          <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500">
                            {a.categorie}
                          </span>
                        )}
                        {ligneDiff?.type === "ajoute" && (
                          <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-800">
                            ajouté depuis impression
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        {ligneDiff?.type === "prix_modifie" ? (
                          <span className="font-mono">
                            <span className="text-red-500 line-through">{ligneDiff.prixAvant}.–</span>{" "}
                            <span className="font-medium text-emerald-700">{ligneDiff.prixApres}.–</span>
                          </span>
                        ) : (
                          <span className="font-mono">{a.prix}.–</span>
                        )}
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUT_STYLES[a.statut] ?? "bg-zinc-100 text-zinc-600"}`}>
                          {STATUT_LABELS[a.statut] ?? a.statut}
                        </span>
                      </div>
                    </li>
                  );
                })}
                {lignesSupprimees.map((l) => (
                  <li
                    key={`supprime-${l.nom}`}
                    className="flex items-center justify-between py-2 text-sm text-red-500 line-through"
                  >
                    <span>{l.nom}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{l.prix}.–</span>
                      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 no-underline">
                        retiré depuis impression
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </div>
    </main>
  );
}
