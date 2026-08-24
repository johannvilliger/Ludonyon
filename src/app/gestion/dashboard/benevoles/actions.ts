"use server";

import { revalidatePath } from "next/cache";
import { nouveauCode, nouvelId, queryOne, withTransaction } from "@/lib/db";

export type FormState = { error: string | null };

export async function creerBenevole(_prevState: FormState, formData: FormData): Promise<FormState> {
  const nom = String(formData.get("nom") ?? "").trim();
  const telephone = String(formData.get("telephone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  if (!nom) return { error: "Le nom est obligatoire." };

  const edition = await queryOne<{ id: string }>("SELECT id FROM editions WHERE active_flag = 1");

  try {
    await withTransaction(async (conn) => {
      const vendeurId = nouvelId();
      await conn.query("INSERT INTO vendeurs (id, nom, telephone, email) VALUES (?, ?, ?, ?)", [
        vendeurId,
        nom,
        telephone || null,
        email || null,
      ]);

      const [rows] = await conn.query<import("mysql2").RowDataPacket[]>(
        "SELECT COALESCE(MAX(numero_fixe), 902) + 1 AS suivant FROM benevoles",
      );
      const numeroFixe = rows[0].suivant as number;

      await conn.query("INSERT INTO benevoles (id, vendeur_id, numero_fixe) VALUES (?, ?, ?)", [
        nouvelId(),
        vendeurId,
        numeroFixe,
      ]);

      // S'il y a une édition active, le bénévole peut déposer tout de suite
      // — pas besoin d'attendre la prochaine édition.
      if (edition) {
        await conn.query(
          "INSERT INTO participations (id, edition_id, vendeur_id, numero_vendeur, code_confirmation, est_benevole) VALUES (?, ?, ?, ?, ?, 1)",
          [nouvelId(), edition.id, vendeurId, numeroFixe, nouveauCode()],
        );
      }
    });
  } catch {
    return { error: "Impossible de créer le bénévole, réessayez." };
  }

  revalidatePath("/gestion/dashboard/benevoles");
  return { error: null };
}
