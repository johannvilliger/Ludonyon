import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { enregistrerEchec, ipAppelante, reinitialiserEchecs, verifierBlocage } from "@/lib/rate-limit";
import { BlocageTentatives } from "@/components/BlocageTentatives";
import { EditForm } from "./edit-form";

type Participation = { id: string; numero_vendeur: number; phase: string };
type Article = { nom: string; prix: number };

export const dynamic = "force-dynamic";

export default async function ModifierListePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  // Même compteur que /vendeur/confirmation/[code] : les deux pages
  // exposent le même espace de codes, un partage évite qu'on contourne le
  // blocage en alternant entre les deux URLs.
  const ip = await ipAppelante();
  const cle = `vendeur-lien:${ip}`;
  const blocage = verifierBlocage(cle);
  if (blocage.bloque) return <BlocageTentatives secondesRestantes={blocage.secondesRestantes} />;

  const participation = await queryOne<Participation>(
    `SELECT p.id, p.numero_vendeur, e.phase
     FROM participations p JOIN editions e ON e.id = p.edition_id
     WHERE p.code_confirmation = ?`,
    [code],
  );

  if (!participation) {
    await enregistrerEchec(cle, ip, "/vendeur/confirmation ou /vendeur/modifier");
    notFound();
  }
  reinitialiserEchecs(cle);

  const articles = await query<Article>(
    "SELECT nom, prix FROM articles WHERE participation_id = ? ORDER BY numero_article",
    [participation.id],
  );

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Modifier ma liste</h1>
      <p className="mt-2 text-zinc-600">Vendeur n° {participation.numero_vendeur}</p>

      {participation.phase !== "depot" ? (
        <p className="mt-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          La modification n&apos;est plus possible : le dépôt est terminé. Contactez le comité si vous
          devez encore corriger quelque chose.
        </p>
      ) : (
        <EditForm code={code} initialArticles={articles} />
      )}
    </main>
  );
}
