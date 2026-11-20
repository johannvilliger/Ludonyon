"use server";

import { revalidatePath } from "next/cache";
import { query, queryOne } from "@/lib/db";
import { dashboardEstConnecte } from "@/lib/gestion";

// Vendeur jamais passé par l'accueil (no-show) : on ne supprime jamais sa
// participation (liste/articles saisis en ligne gardés pour archive), on le
// marque juste absent pour qu'il sorte des statistiques de réception
// (vendeurs venus, articles en attente/total) sans fausser le reste.
export async function marquerAbsent(participationId: string, absent: boolean) {
  if (!(await dashboardEstConnecte())) throw new Error("Non autorisé.");

  await query("UPDATE participations SET absent = ? WHERE id = ?", [absent, participationId]);

  revalidatePath("/gestion/dashboard");
  revalidatePath("/gestion/dashboard/absents");
  revalidatePath("/gestion/dashboard/vendeurs");
}

// Marque en une fois tous les vendeurs encore en attente (liste jamais
// contrôlée à l'accueil) comme absents — pratique en fin d'accueil, quand on
// sait que les retardataires ne viendront plus.
export async function marquerTousAbsents(): Promise<number> {
  if (!(await dashboardEstConnecte())) throw new Error("Non autorisé.");

  const edition = await queryOne<{ id: string }>("SELECT id FROM editions WHERE active_flag = 1");
  if (!edition) throw new Error("Aucune édition active.");

  const aMarquer = await query<{ id: string }>(
    "SELECT id FROM participations WHERE edition_id = ? AND statut = 'liste_soumise' AND absent = 0",
    [edition.id],
  );
  if (aMarquer.length === 0) return 0;

  await query(
    "UPDATE participations SET absent = 1 WHERE edition_id = ? AND statut = 'liste_soumise' AND absent = 0",
    [edition.id],
  );

  revalidatePath("/gestion/dashboard");
  revalidatePath("/gestion/dashboard/absents");
  revalidatePath("/gestion/dashboard/vendeurs");
  return aMarquer.length;
}
