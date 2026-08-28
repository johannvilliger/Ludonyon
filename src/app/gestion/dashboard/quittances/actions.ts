"use server";

import { revalidatePath } from "next/cache";
import { envoyerUneQuittance } from "@/app/caisse/[numero]/actions";
import { dashboardEstConnecte } from "@/lib/gestion";

// Renvoi manuel depuis le dashboard : pour une quittance en échec (SMTP
// temporairement indisponible) ou restée en_attente sans avoir jamais pu se
// déclencher normalement (voir flusherQuittancesEnAttente dans
// caisse/[numero]/actions.ts — vente suivante ou clôture de caisse).
export async function renvoyerQuittance(quittanceId: string): Promise<void> {
  if (!(await dashboardEstConnecte())) throw new Error("Non autorisé.");
  await envoyerUneQuittance(quittanceId);
  revalidatePath("/gestion/dashboard/quittances");
}
