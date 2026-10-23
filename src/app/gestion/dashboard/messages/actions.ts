"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { dashboardEstConnecte } from "@/lib/gestion";

export type ActionState = { error: string | null };

export async function marquerMessageTraite(messageId: string, traite: boolean): Promise<ActionState> {
  if (!(await dashboardEstConnecte())) throw new Error("Non autorisé.");

  await query("UPDATE messages_assistant SET traite = ? WHERE id = ?", [traite ? 1 : 0, messageId]);

  revalidatePath("/gestion/dashboard/messages");
  revalidatePath("/gestion/dashboard");
  return { error: null };
}
