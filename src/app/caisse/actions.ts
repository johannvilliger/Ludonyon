"use server";

import { redirect } from "next/navigation";
import { nouvelId, query, queryOne } from "@/lib/db";

export type FormState = { error: string | null };

export async function creerCaisse(_prevState: FormState, formData: FormData): Promise<FormState> {
  const nom = String(formData.get("nom") ?? "").trim();
  if (!nom) return { error: "Donne un nom à cette caisse (ex. « Caisse 1 »)." };

  const edition = await queryOne<{ id: string }>("SELECT id FROM editions WHERE statut = 'ouverte' LIMIT 1");
  if (!edition) {
    return { error: "Aucune édition n'est ouverte pour le moment." };
  }

  const caisseId = nouvelId();
  try {
    await query("INSERT INTO caisses (id, edition_id, nom) VALUES (?, ?, ?)", [caisseId, edition.id, nom]);
  } catch {
    return { error: "Impossible de créer la caisse, réessaie." };
  }

  redirect(`/caisse/${caisseId}`);
}
