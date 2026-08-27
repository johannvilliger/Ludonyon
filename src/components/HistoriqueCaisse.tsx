import { formaterMontant } from "@/lib/argent";
import type { LigneHistorique } from "@/lib/historique";

function formatHeure(dateStr: string): string {
  const d = new Date(dateStr.replace(" ", "T"));
  return d.toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" });
}

export function HistoriqueCaisse({ lignes }: { lignes: LigneHistorique[] }) {
  if (lignes.length === 0) {
    return <p className="mt-3 text-sm text-zinc-500">Aucune transaction pour l&apos;instant.</p>;
  }

  const ventes = lignes.filter((l) => l.type === "vente");
  const totalVentes = ventes.reduce((sum, l) => sum + l.total, 0);
  const totalVidages = lignes
    .filter((l) => l.type === "vidage")
    .reduce((sum, l) => sum + l.montant, 0);

  return (
    <div className="mt-3">
      <p className="text-sm text-zinc-500">
        {ventes.length} vente{ventes.length > 1 ? "s" : ""} · {formaterMontant(totalVentes)}
        {totalVidages > 0 && <> · {formaterMontant(totalVidages)} vidé</>}
      </p>
      <ul className="mt-2 divide-y divide-zinc-200 rounded-md border border-zinc-200">
        {lignes.map((l) =>
          l.type === "vente" ? (
            <li key={`vente-${l.id}`} className="flex items-center justify-between px-4 py-3 text-sm">
              <span>
                {formatHeure(l.createdAt)} — {l.nbArticles} article{l.nbArticles > 1 ? "s" : ""}
                {l.acheteurBenevole ? (
                  <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                    acheteur bénévole
                  </span>
                ) : null}
              </span>
              <span className="font-mono">{formaterMontant(l.total)}</span>
            </li>
          ) : (
            <li key={`vidage-${l.id}`} className="flex items-center justify-between bg-red-50 px-4 py-3 text-sm">
              <span>
                {formatHeure(l.createdAt)} — Vidage
                {l.effectuePar && <span className="ml-2 text-xs text-zinc-500">par {l.effectuePar}</span>}
              </span>
              <span className="font-mono text-red-700">−{formaterMontant(l.montant)}</span>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
