"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";

export async function definirBenevole(code: string, estBenevole: boolean) {
  await query("UPDATE participations SET est_benevole = ? WHERE code_confirmation = ?", [estBenevole, code]);

  revalidatePath(`/accueil/vendeur/${code}`);
}

export async function marquerControlee(code: string) {
  await query("UPDATE participations SET statut = 'controlee' WHERE code_confirmation = ?", [code]);

  revalidatePath(`/accueil/vendeur/${code}`);
}

export async function basculerRecu(articleId: string, code: string) {
  // On ne touche jamais un article déjà vendu ou invendu — seul le
  // va-et-vient non_recu <-> recu est piloté depuis l'accueil.
  await query(
    "UPDATE articles SET statut = IF(statut = 'non_recu', 'recu', 'non_recu') WHERE id = ? AND statut IN ('non_recu', 'recu')",
    [articleId],
  );

  revalidatePath(`/accueil/vendeur/${code}`);
}
