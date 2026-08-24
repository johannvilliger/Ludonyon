import "server-only";
import { query } from "@/lib/db";

export type LigneHistorique =
  | { type: "vente"; id: string; createdAt: string; acheteurBenevole: boolean; nbArticles: number; total: number }
  | { type: "vidage"; id: string; createdAt: string; montant: number; effectuePar: string | null };

export async function historiqueCaisse(caisseId: string): Promise<LigneHistorique[]> {
  const ventes = await query<{
    id: string;
    acheteur_benevole: number;
    created_at: string;
    nb_articles: number;
    total: number;
  }>(
    `SELECT v.id, v.acheteur_benevole, v.created_at,
            COUNT(va.id) AS nb_articles, COALESCE(SUM(va.prix_encaisse), 0) AS total
     FROM ventes v
     LEFT JOIN vente_articles va ON va.vente_id = v.id
     WHERE v.caisse_id = ?
     GROUP BY v.id, v.acheteur_benevole, v.created_at`,
    [caisseId],
  );

  const vidages = await query<{ id: string; montant: number; effectue_par: string | null; created_at: string }>(
    "SELECT id, montant, effectue_par, created_at FROM mouvements_caisse WHERE caisse_id = ?",
    [caisseId],
  );

  const lignes: LigneHistorique[] = [
    ...ventes.map((v) => ({
      type: "vente" as const,
      id: v.id,
      createdAt: v.created_at,
      acheteurBenevole: Boolean(v.acheteur_benevole),
      nbArticles: Number(v.nb_articles),
      total: Number(v.total),
    })),
    ...vidages.map((m) => ({
      type: "vidage" as const,
      id: m.id,
      createdAt: m.created_at,
      montant: Number(m.montant),
      effectuePar: m.effectue_par,
    })),
  ];

  lignes.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  return lignes;
}
