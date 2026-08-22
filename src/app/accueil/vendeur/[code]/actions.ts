"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";

export async function definirBenevole(code: string, estBenevole: boolean) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("participations")
    .update({ est_benevole: estBenevole })
    .eq("code_confirmation", code);

  if (error) throw new Error("Impossible de mettre à jour le statut bénévole.");

  revalidatePath(`/accueil/vendeur/${code}`);
}

export async function marquerControlee(code: string) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("participations")
    .update({ statut: "controlee" })
    .eq("code_confirmation", code);

  if (error) throw new Error("Impossible de marquer la liste comme contrôlée.");

  revalidatePath(`/accueil/vendeur/${code}`);
}
