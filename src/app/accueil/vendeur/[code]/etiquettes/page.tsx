import { notFound } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { query, queryOne } from "@/lib/db";
import { estVendeurSpecial } from "@/lib/vendeurs-speciaux";
import { EtiquettesVendeur } from "./etiquettes-vendeur";

type Participation = { id: string; numero_vendeur: number; nom_vendeur: string; telephone: string | null };
type Article = { numero_article: number; nom: string; prix: number };

export default async function EtiquettesPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const participation = await queryOne<Participation>(
    `SELECT p.id, p.numero_vendeur, v.nom AS nom_vendeur, v.telephone
     FROM participations p
     JOIN vendeurs v ON v.id = p.vendeur_id
     WHERE p.code_confirmation = ?`,
    [code],
  );

  if (!participation) notFound();

  const special = estVendeurSpecial(participation.numero_vendeur);

  // Un article refusé (mauvais état / sale / cassé) est repris par le
  // vendeur et jamais mis en vente : pas la peine de gâcher une étiquette.
  const articles = await query<Article>(
    "SELECT numero_article, nom, prix FROM articles WHERE participation_id = ? AND statut != 'refuse' ORDER BY numero_article",
    [participation.id],
  );

  const labels = await Promise.all(
    articles.map(async (a) => {
      // Le QR ne porte que ce dont la caisse a besoin pour retrouver l'article ;
      // vendeur et prix restent aussi imprimés en clair sur l'étiquette (voir
      // globals.css) pour rester lisibles si le QR s'abîme.
      const contenuQr = `${participation.numero_vendeur}-${String(a.numero_article).padStart(2, "0")}-${a.prix}`;
      const svg = await QRCode.toString(contenuQr, {
        type: "svg",
        margin: 1,
        errorCorrectionLevel: "M",
      });
      return { ...a, svg };
    }),
  );

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10 print:m-0 print:max-w-none print:p-0">
      <Link
        href={`/accueil/vendeur/${code}`}
        className="mb-1 block text-sm text-zinc-500 hover:underline print:hidden"
      >
        ← Vendeur n° {participation.numero_vendeur}
      </Link>

      <EtiquettesVendeur
        numeroVendeur={participation.numero_vendeur}
        nomVendeur={participation.nom_vendeur}
        telephone={participation.telephone}
        special={special}
        labels={labels}
      />
    </main>
  );
}
