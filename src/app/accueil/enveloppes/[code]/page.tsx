import { notFound } from "next/navigation";
import Link from "next/link";
import { queryOne } from "@/lib/db";
import { ConfirmationRemise } from "./confirmation-remise";

type Participation = {
  id: string;
  numero_vendeur: number;
  nom_vendeur: string;
  enveloppe_recuperee_le: string | null;
  enveloppe_signature: string | null;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
function formaterDateHeure(iso: string): string {
  const d = new Date(iso);
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()} à ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export default async function EnveloppeVendeurPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const participation = await queryOne<Participation>(
    `SELECT p.id, p.numero_vendeur, v.nom AS nom_vendeur, p.enveloppe_recuperee_le, p.enveloppe_signature
     FROM participations p
     JOIN vendeurs v ON v.id = p.vendeur_id
     JOIN editions e ON e.id = p.edition_id
     WHERE p.code_confirmation = ? AND e.active_flag = 1`,
    [code],
  );
  if (!participation) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <Link href="/accueil/enveloppes" className="text-sm text-zinc-500 hover:underline">
        ← Récupération des enveloppes
      </Link>

      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Vendeur #{participation.numero_vendeur} — {participation.nom_vendeur}
      </h1>

      {participation.enveloppe_recuperee_le ? (
        <div className="mt-6">
          <p className="rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
            Enveloppe déjà récupérée le {formaterDateHeure(participation.enveloppe_recuperee_le)}.
          </p>
          {participation.enveloppe_signature && (
            <div className="mt-4">
              <p className="text-sm font-medium text-zinc-700">Signature enregistrée :</p>
              {/* eslint-disable-next-line @next/next/no-img-element -- image en data URL stockée en base, pas une ressource distante à optimiser */}
              <img
                src={participation.enveloppe_signature}
                alt="Signature du vendeur"
                className="mt-2 w-full max-w-sm rounded-md border border-zinc-200 bg-white"
              />
            </div>
          )}
        </div>
      ) : (
        <ConfirmationRemise participationId={participation.id} />
      )}
    </main>
  );
}
