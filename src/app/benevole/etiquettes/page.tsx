import { redirect } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { query, queryOne } from "@/lib/db";
import { benevoleConnecte } from "@/lib/benevole-session";
import { estVendeurSpecial } from "@/lib/vendeurs-speciaux";
import { GenerateurEtiquettes } from "./generateur-etiquettes";

export const dynamic = "force-dynamic";

export default async function EtiquettesBenevolePage() {
  const session = await benevoleConnecte();
  if (!session) redirect("/benevole");

  const participation = await queryOne<{ id: string }>(
    `SELECT p.id FROM participations p JOIN editions e ON e.id = p.edition_id
     WHERE p.vendeur_id = ? AND e.active_flag = 1`,
    [session.vendeurId],
  );

  // Un article refusé est repris par le vendeur et jamais mis en vente :
  // pas la peine de gâcher une étiquette (même exclusion que les autres
  // écrans d'impression d'étiquettes).
  const articlesRaw = participation
    ? await query<{ numero_article: number; nom: string; prix: number; etiquette_imprimee_le: string | null }>(
        `SELECT numero_article, nom, prix, etiquette_imprimee_le FROM articles
         WHERE participation_id = ? AND statut != 'refuse' ORDER BY numero_article`,
        [participation.id],
      )
    : [];

  const articles = await Promise.all(
    articlesRaw.map(async (a) => {
      // Même contenu de QR que les autres écrans d'étiquettes, pour que la
      // caisse le lise exactement pareil.
      const contenuQr = `${session.numeroFixe}-${String(a.numero_article).padStart(2, "0")}-${a.prix}`;
      const svg = await QRCode.toString(contenuQr, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
      return {
        numeroArticle: a.numero_article,
        nom: a.nom,
        prix: a.prix,
        svg,
        dejaImprimee: Boolean(a.etiquette_imprimee_le),
      };
    }),
  );

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10 print:m-0 print:max-w-none print:p-0">
      <div className="mb-6 print:hidden">
        <Link href="/benevole/liste" className="text-sm text-zinc-500 hover:underline">
          ← Ma liste
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Imprimer mes étiquettes</h1>
      </div>

      {articles.length === 0 ? (
        <p className="text-sm text-zinc-500 print:hidden">Aucun article pour le moment.</p>
      ) : (
        <GenerateurEtiquettes
          numeroVendeur={session.numeroFixe}
          articles={articles}
          special={estVendeurSpecial(session.numeroFixe)}
        />
      )}
    </main>
  );
}
