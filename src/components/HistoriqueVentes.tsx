import type { LigneHistorique } from "@/lib/historique";

function formatHeure(dateStr: string): string {
  const d = new Date(dateStr.replace(" ", "T"));
  return d.toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" });
}

export function HistoriqueVentes({ lignes }: { lignes: LigneHistorique[] }) {
  if (lignes.length === 0) {
    return <p className="mt-3 text-sm text-zinc-500">Aucune vente pour l&apos;instant.</p>;
  }

  const total = lignes.reduce((sum, l) => sum + Number(l.total), 0);

  return (
    <div className="mt-3">
      <p className="text-sm text-zinc-500">
        {lignes.length} vente{lignes.length > 1 ? "s" : ""} · {total}.–
      </p>
      <ul className="mt-2 divide-y divide-zinc-200 rounded-md border border-zinc-200">
        {lignes.map((l) => (
          <li key={l.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <span>
              {formatHeure(l.created_at)} — {l.nb_articles} article{l.nb_articles > 1 ? "s" : ""}
              {l.acheteur_benevole ? (
                <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                  acheteur bénévole
                </span>
              ) : null}
            </span>
            <span className="font-mono">{l.total}.–</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
