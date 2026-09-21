"use client";

import { useEffect, useState } from "react";
import { messageMotInterdit, motInterdit } from "@/lib/articles-interdits";
import { ETIQUETTE_LABELS, ETIQUETTE_STYLES, type StatutEtiquette } from "@/lib/etiquette-article-statut";

type ArticleRow = { nom: string; prix: string };

const MAX_ARTICLES = 30;
const LIGNES_SUPPLEMENTAIRES = 10;

function lignesVides(n: number): ArticleRow[] {
  return Array.from({ length: n }, () => ({ nom: "", prix: "" }));
}

// Prix entier obligatoire (pas de centimes) : la virgule et le point sont
// tous deux refusés, quel que soit ce que le navigateur laisse taper dans
// le champ number selon la locale.
function contientCentimes(prix: string): boolean {
  return prix.includes(".") || prix.includes(",");
}

function prixEstInvalide(prix: string): boolean {
  if (prix.trim() === "") return false;
  if (contientCentimes(prix)) return true;
  const n = Number(prix);
  return !Number.isInteger(n) || n <= 0;
}

const LONGUEUR_MIN_NOM = 3;

function nomTropCourt(nom: string): boolean {
  const longueur = nom.trim().length;
  return longueur > 0 && longueur < LONGUEUR_MIN_NOM;
}

export function ArticleListEditor({
  fieldName = "articles",
  initialArticles,
  onValiditeChange,
  illimite = false,
  numeroDepart = 1,
  statutsEtiquetteParNom,
}: {
  fieldName?: string;
  initialArticles?: { nom: string; prix: number }[];
  onValiditeChange?: (valide: boolean) => void;
  // Pas de plafond de 30 (comptes bénévoles 9xx) : les 30 premières lignes
  // restent affichées d'emblée, mais un bouton permet d'en ajouter au-delà.
  // Active aussi la grille 2 colonnes et la recherche ci-dessous, utiles
  // seulement à ce volume-là.
  illimite?: boolean;
  // Numérotation affichée à côté des lignes : par défaut 1, 2, 3… mais sur
  // /benevole/liste ces lignes viennent APRÈS des articles déjà reçus
  // affichés au-dessus (non gérés par ce composant) — sans décalage, la
  // numérotation visible repartirait de 1 alors que ce sont en réalité les
  // articles 12, 13, 14…
  numeroDepart?: number;
  // Statut d'impression d'étiquette par nom d'article (normalisé,
  // minuscules) — seul /benevole/liste le fournit (901/902 impriment par
  // lots, voir GenerateurEtiquettes). Absent ailleurs, aucun badge affiché.
  statutsEtiquetteParNom?: Record<string, StatutEtiquette>;
}) {
  // Complète toujours jusqu'à MAX_ARTICLES lignes vides après les articles
  // déjà présents : sur le formulaire de modification, initialArticles ne
  // contient que les articles existants — sans ce complément, impossible
  // d'ajouter un nouvel article, seulement de modifier ceux déjà là.
  const [articles, setArticles] = useState<ArticleRow[]>(() => {
    const remplies = (initialArticles ?? []).map((a) => ({ nom: a.nom, prix: String(a.prix) }));
    return [...remplies, ...lignesVides(Math.max(0, MAX_ARTICLES - remplies.length))];
  });
  const [recherche, setRecherche] = useState("");

  useEffect(() => {
    const remplis = articles.filter((a) => a.nom.trim().length > 0);
    const comptage = new Map<string, number>();
    for (const a of remplis) {
      const nom = a.nom.trim().toLowerCase();
      comptage.set(nom, (comptage.get(nom) ?? 0) + 1);
    }
    const invalide = remplis.some(
      (a) =>
        motInterdit(a.nom) ||
        prixEstInvalide(a.prix) ||
        nomTropCourt(a.nom) ||
        (comptage.get(a.nom.trim().toLowerCase()) ?? 0) > 1,
    );
    onValiditeChange?.(!invalide);
  }, [articles, onValiditeChange]);

  function updateArticle(index: number, field: keyof ArticleRow, value: string) {
    setArticles((prev) =>
      prev.map((article, i) => (i === index ? { ...article, [field]: value } : article)),
    );
  }

  // On ne retire jamais la ligne elle-même (ça décale toutes les suivantes
  // et il n'y a plus moyen de la récupérer) — on vide juste son contenu.
  function viderArticle(index: number) {
    setArticles((prev) => prev.map((article, i) => (i === index ? { nom: "", prix: "" } : article)));
  }

  function ajouterLignes() {
    setArticles((prev) => [...prev, ...lignesVides(LIGNES_SUPPLEMENTAIRES)]);
  }

  const articlesRemplis = articles.filter((a) => a.nom.trim().length > 0);
  const articlesJson = JSON.stringify(
    articlesRemplis.map((a) => ({ nom: a.nom, prix: Number(a.prix) || 0 })),
  );

  // Deux articles au même nom (même vendeur) sont indistinguables une fois
  // étiquetés — bloquant, comme les autres erreurs ci-dessous (voir useEffect).
  const comptageNoms = new Map<string, number>();
  for (const a of articlesRemplis) {
    const nom = a.nom.trim().toLowerCase();
    comptageNoms.set(nom, (comptageNoms.get(nom) ?? 0) + 1);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Articles</h2>
        <span className="text-sm text-zinc-500">
          {illimite ? `${articlesRemplis.length} article${articlesRemplis.length > 1 ? "s" : ""}` : `${articlesRemplis.length} / ${MAX_ARTICLES}`}
        </span>
      </div>

      {illimite && articles.length > 8 && (
        <input
          type="text"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher un article…"
          className="mt-3 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
      )}

      <div className={illimite ? "mt-3 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2" : "mt-3 space-y-2"}>
        {articles.map((article, i) => {
          const nomRempli = article.nom.trim().length > 0;
          const terme = recherche.trim().toLowerCase();
          // Une ligne encore vide reste toujours visible (pour continuer à
          // ajouter des articles) — seules les lignes remplies qui ne
          // correspondent pas à la recherche sont masquées.
          if (terme && nomRempli && !article.nom.toLowerCase().includes(terme)) return null;

          const mot = nomRempli ? motInterdit(article.nom) : null;
          const prixInvalide = nomRempli && prixEstInvalide(article.prix);
          const centimes = prixInvalide && contientCentimes(article.prix);
          const courtInvalide = nomRempli && nomTropCourt(article.nom);
          const nomDuplique =
            nomRempli && (comptageNoms.get(article.nom.trim().toLowerCase()) ?? 0) > 1;
          const statutEtiquette = nomRempli
            ? statutsEtiquetteParNom?.[article.nom.trim().toLowerCase()]
            : undefined;
          return (
            <div key={i}>
              <div className="flex items-center gap-2">
                <span className="w-6 shrink-0 text-sm text-zinc-400">
                  {String(numeroDepart + i).padStart(2, "0")}
                </span>
                <input
                  value={article.nom}
                  onChange={(e) => updateArticle(i, "nom", e.target.value)}
                  placeholder="Nom de l'objet"
                  className={
                    mot || courtInvalide || nomDuplique
                      ? "flex-1 rounded-md border border-red-400 px-3 py-2"
                      : "flex-1 rounded-md border border-zinc-300 px-3 py-2"
                  }
                />
                <input
                  value={article.prix}
                  onChange={(e) => updateArticle(i, "prix", e.target.value)}
                  type="number"
                  min={1}
                  step={1}
                  placeholder="CHF"
                  className={
                    prixInvalide
                      ? "w-24 rounded-md border border-red-400 px-3 py-2"
                      : "w-24 rounded-md border border-zinc-300 px-3 py-2"
                  }
                />
                <button
                  type="button"
                  onClick={() => viderArticle(i)}
                  disabled={!article.nom && !article.prix}
                  className="shrink-0 rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-500 hover:border-red-400 hover:text-red-600 disabled:opacity-0"
                >
                  Vider
                </button>
              </div>
              {mot && <p className="ml-8 mt-1 text-sm text-red-600">{messageMotInterdit(mot)}</p>}
              {!mot && prixInvalide && (
                <p className="ml-8 mt-1 text-sm text-red-600">
                  {centimes
                    ? "Pas de centimes : indiquez un prix en francs entiers (ex. 12, pas 12.50)."
                    : "Indiquez un prix supérieur à 0.–."}
                </p>
              )}
              {!mot && !prixInvalide && courtInvalide && (
                <p className="ml-8 mt-1 text-sm text-red-600">
                  Le nom doit contenir au moins {LONGUEUR_MIN_NOM} caractères.
                </p>
              )}
              {!mot && !prixInvalide && !courtInvalide && nomDuplique && (
                <p className="ml-8 mt-1 text-sm text-red-600">
                  Vous avez déjà un article « {article.nom.trim()} » dans la liste — si c&apos;est un
                  objet similaire, ajoutez un détail pour le distinguer (ex. couleur, taille, édition).
                </p>
              )}
              {!mot && !prixInvalide && !courtInvalide && !nomDuplique && statutEtiquette && (
                <p className="ml-8 mt-1">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ETIQUETTE_STYLES[statutEtiquette]}`}
                  >
                    {ETIQUETTE_LABELS[statutEtiquette]}
                  </span>
                </p>
              )}
            </div>
          );
        })}
      </div>

      {illimite && (
        <button
          type="button"
          onClick={ajouterLignes}
          className="mt-3 rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:border-zinc-400"
        >
          + Ajouter {LIGNES_SUPPLEMENTAIRES} lignes
        </button>
      )}

      <input type="hidden" name={fieldName} value={articlesJson} />
    </div>
  );
}
