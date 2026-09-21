"use client";

import { useState } from "react";
import { ETIQUETTE_LABELS, ETIQUETTE_STYLES, statutEtiquetteArticle } from "@/lib/etiquette-article-statut";

export type ArticleVerrouille = {
  id: string;
  numero_article: number;
  nom: string;
  prix: number;
  statut: string;
  etiquette_nom_imprime: string | null;
  etiquette_prix_imprime: number | null;
  etiquette_imprimee_le: string | null;
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

// Grille 2 colonnes + recherche : pensé pour 901/902 qui peuvent monter à
// ~250 articles (contre 30 pour un vendeur normal), mais s'applique à tout
// bénévole puisque c'est la même page.
export function ArticlesVerrouilles({ articles }: { articles: ArticleVerrouille[] }) {
  const [recherche, setRecherche] = useState("");
  const terme = recherche.trim().toLowerCase();
  const filtres = terme ? articles.filter((a) => a.nom.toLowerCase().includes(terme)) : articles;

  return (
    <div>
      {articles.length > 8 && (
        <input
          type="text"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher un article…"
          className="mt-3 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
      )}

      {terme && filtres.length === 0 && (
        <p className="mt-3 text-sm text-zinc-500">Aucun article pour « {recherche} ».</p>
      )}

      <ul className="mt-3 grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        {filtres.map((a) => {
          const statutEtiquette = statutEtiquetteArticle(a);
          return (
            <li
              key={a.id}
              className="flex items-center gap-2 border-b border-zinc-100 py-2 text-sm last:border-b-0"
            >
              <span className="w-6 shrink-0 text-zinc-400">{String(a.numero_article).padStart(2, "0")}</span>
              <span className="min-w-0 flex-1 truncate">
                {a.nom} <span className="font-mono text-zinc-500">{a.prix}.–</span>
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${ETIQUETTE_STYLES[statutEtiquette]}`}
              >
                {ETIQUETTE_LABELS[statutEtiquette]}
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUT_STYLES[a.statut] ?? "bg-zinc-100 text-zinc-600"}`}
              >
                {STATUT_LABELS[a.statut] ?? a.statut}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
