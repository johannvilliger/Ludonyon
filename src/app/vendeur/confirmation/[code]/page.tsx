import { notFound } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { query, queryOne } from "@/lib/db";
import { enregistrerEchec, ipAppelante, reinitialiserEchecs, verifierBlocage } from "@/lib/rate-limit";
import { BlocageTentatives } from "@/components/BlocageTentatives";
import { PrintButton } from "./print-button";

type Participation = { id: string; numero_vendeur: number; code_confirmation: string };
type Article = { numero_article: number; nom: string; prix: number };

export default async function ConfirmationPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  // Le code fait 48 bits d'entropie (peu devinable), mais on protège quand
  // même contre une tentative de brute-force automatisée sur ce lien public.
  const ip = await ipAppelante();
  const cle = `vendeur-lien:${ip}`;
  const blocage = verifierBlocage(cle);
  if (blocage.bloque) return <BlocageTentatives secondesRestantes={blocage.secondesRestantes} />;

  const participation = await queryOne<Participation>(
    "SELECT id, numero_vendeur, code_confirmation FROM participations WHERE code_confirmation = ?",
    [code],
  );

  if (!participation) {
    await enregistrerEchec(cle, ip, "/vendeur/confirmation ou /vendeur/modifier");
    notFound();
  }
  reinitialiserEchecs(cle);

  const articles = await query<Article>(
    "SELECT numero_article, nom, prix FROM articles WHERE participation_id = ? ORDER BY numero_article",
    [participation.id],
  );

  const qrDataUrl = await QRCode.toDataURL(participation.code_confirmation, {
    margin: 1,
    width: 220,
  });

  const total = articles.reduce((sum, a) => sum + a.prix, 0);

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Liste enregistrée</h1>
      <p className="mt-2 text-zinc-600">
        Vendeur n° <strong>{participation.numero_vendeur}</strong> — présentez ce code au dépôt,
        le comité imprimera vos étiquettes sur place.
      </p>

      <div className="mt-6 flex flex-col items-center gap-3 rounded-lg border border-zinc-200 p-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrDataUrl}
          alt={`QR de confirmation ${participation.code_confirmation}`}
          width={180}
          height={180}
        />
        <p className="font-mono text-sm text-zinc-500">{participation.code_confirmation}</p>
        <PrintButton />
      </div>

      <Link
        href={`/vendeur/modifier/${participation.code_confirmation}`}
        className="mt-4 inline-block text-sm text-zinc-600 hover:underline print:hidden"
      >
        Modifier ma liste →
      </Link>

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
