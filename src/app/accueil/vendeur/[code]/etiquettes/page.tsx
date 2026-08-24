import { notFound } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { query, queryOne } from "@/lib/db";
import { PrintButton } from "./print-button";

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

  const articles = await query<Article>(
    "SELECT numero_article, nom, prix FROM articles WHERE participation_id = ? ORDER BY numero_article",
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
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <div>
          <Link href={`/accueil/vendeur/${code}`} className="text-sm text-zinc-500 hover:underline">
            ← Vendeur n° {participation.numero_vendeur}
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {labels.length} étiquette{labels.length > 1 ? "s" : ""}
          </h1>
        </div>
        <PrintButton />
      </div>

      <div className="label-sheet">
        <div className="label label--contact">
          <div className="label__row">
            <span className="label__vendor">#{participation.numero_vendeur}</span>
          </div>
          <div className="label__contact-nom">{participation.nom_vendeur}</div>
          <div className="label__contact-tel">{participation.telephone || "—"}</div>
        </div>
        {labels.map((l) => (
          <div key={l.numero_article} className="label">
            <div className="label__row">
              <span className="label__vendor">{participation.numero_vendeur}</span>
              <span className="label__item">{String(l.numero_article).padStart(2, "0")}</span>
            </div>
            <div className="label__price">{l.prix}.–</div>
            <div className="label__row label__row--bottom">
              {/* le SVG est produit par la librairie `qrcode` côté serveur à partir
                  d'une chaîne qu'on construit nous-mêmes, pas de contenu utilisateur brut */}
              <div className="qr-wrap" dangerouslySetInnerHTML={{ __html: l.svg }} />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
