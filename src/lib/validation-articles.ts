import { messageMotInterdit, motInterdit } from "./articles-interdits";

// Utilisé en filet de sécurité côté serveur derrière ArticleListEditor
// (voir son useEffect de validation) — mêmes règles, y compris le blocage
// sur deux articles au même nom.
export function erreurArticles(articles: { nom: string; prix: number }[]): string | null {
  const comptage = new Map<string, number>();
  for (const a of articles) {
    const nom = a.nom.trim().toLowerCase();
    comptage.set(nom, (comptage.get(nom) ?? 0) + 1);
  }

  for (const a of articles) {
    const nomTrim = a.nom.trim();
    if (nomTrim.length < 3) return `Le nom « ${nomTrim} » doit contenir au moins 3 caractères.`;
    const mot = motInterdit(nomTrim);
    if (mot) return messageMotInterdit(mot);
    if (!Number.isFinite(a.prix) || a.prix <= 0) return `Indiquez un prix supérieur à 0.– pour « ${nomTrim} ».`;
    if ((comptage.get(nomTrim.toLowerCase()) ?? 0) > 1) {
      return `Vous avez plusieurs articles nommés « ${nomTrim} » — ajoutez un détail pour les distinguer (ex. couleur, taille, édition).`;
    }
  }

  return null;
}
