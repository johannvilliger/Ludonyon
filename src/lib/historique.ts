import "server-only";
import { query } from "@/lib/db";

export type LigneHistorique = {
  id: string;
  acheteur_benevole: number;
  created_at: string;
  nb_articles: number;
  total: number;
};

export async function historiqueVentesCaisse(caisseId: string): Promise<LigneHistorique[]> {
  return query<LigneHistorique>(
    `SELECT v.id, v.acheteur_benevole, v.created_at,
            COUNT(va.id) AS nb_articles, COALESCE(SUM(va.prix_encaisse), 0) AS total
     FROM ventes v
     LEFT JOIN vente_articles va ON va.vente_id = v.id
     WHERE v.caisse_id = ?
     GROUP BY v.id, v.acheteur_benevole, v.created_at
     ORDER BY v.created_at DESC`,
    [caisseId],
  );
}
