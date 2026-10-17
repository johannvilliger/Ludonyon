import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { query, queryOne } from "@/lib/db";
import { dashboardEstConnecte } from "@/lib/gestion";
import { CorrigerVendeur } from "./corriger-vendeur";

export const dynamic = "force-dynamic";

type Participation = {
  id: string;
  edition_id: string;
  numero_vendeur: number;
  nom_vendeur: string;
  email: string | null;
};
type Article = { id: string; numero_article: number; nom: string; prix: number; statut: string };

function genererMessageParDefaut(numeroVendeur: number, articles: Article[]): string {
  const lignes = articles.length
    ? articles.map((a) => `${String(a.numero_article).padStart(2, "0")} — ${a.nom} — ${a.prix}.–`).join("\n")
    : "(aucun article)";
  return `Bonjour,

Nous avons effectué une correction sur votre liste pour le troc de la Ludothèque Nyon Région.

Voici votre liste à jour (vendeur n° ${numeroVendeur}) :
${lignes}

N'hésitez pas à nous contacter si vous avez des questions.`;
}

export default async function CorrigerPage({
  params,
}: {
  params: Promise<{ participationId: string }>;
}) {
  if (!(await dashboardEstConnecte())) redirect("/gestion");

  const { participationId } = await params;

  const participation = await queryOne<Participation>(
    `SELECT p.id, p.edition_id, p.numero_vendeur, v.nom AS nom_vendeur, v.email
     FROM participations p JOIN vendeurs v ON v.id = p.vendeur_id
     WHERE p.id = ?`,
    [participationId],
  );
  if (!participation) notFound();

  const articles = await query<Article>(
    "SELECT id, numero_article, nom, prix, statut FROM articles WHERE participation_id = ? ORDER BY numero_article",
    [participationId],
  );

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <Link href="/gestion/dashboard/vendeurs" className="text-sm text-zinc-500 hover:underline">
        ← Vendeurs
      </Link>

      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Corriger — Vendeur #{participation.numero_vendeur} — {participation.nom_vendeur}
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        Les articles déjà vendus ou invendus sont verrouillés — on ne corrige jamais une vente déjà
        encaissée.
      </p>

      <CorrigerVendeur
        participation={participation}
        articles={articles}
        messageParDefaut={genererMessageParDefaut(participation.numero_vendeur, articles)}
      />
    </main>
  );
}
