"use server";

import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";

export type FormState = { error: string | null };

export async function creerCaisse(_prevState: FormState, formData: FormData): Promise<FormState> {
  const nom = String(formData.get("nom") ?? "").trim();
  if (!nom) return { error: "Donne un nom à cette caisse (ex. « Caisse 1 »)." };

  const supabase = createServiceClient();

  const { data: edition, error: editionError } = await supabase
    .from("editions")
    .select("id")
    .eq("statut", "ouverte")
    .single();

  if (editionError || !edition) {
    return { error: "Aucune édition n'est ouverte pour le moment." };
  }

  const { data: caisse, error: caisseError } = await supabase
    .from("caisses")
    .insert({ edition_id: edition.id, nom })
    .select("id")
    .single();

  if (caisseError || !caisse) {
    return { error: "Impossible de créer la caisse, réessaie." };
  }

  redirect(`/caisse/${caisse.id}`);
}
