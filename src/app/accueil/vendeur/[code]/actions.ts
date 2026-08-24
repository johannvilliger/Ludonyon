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
