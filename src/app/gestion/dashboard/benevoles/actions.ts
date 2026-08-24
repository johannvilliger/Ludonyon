"use server";

import { revalidatePath } from "next/cache";
import { nouveauCode, nouvelId, queryOne, withTransaction } from "@/lib/db";

export type FormState = { error: string | null };

export async function creerBenevole(_prevState: FormState, formData: FormData): Promise<FormState> {
  const nom = String(formData.get("nom") ?? "").trim();
  const numero = Math.round(Number(formData.get("numero")));
  if (!nom) return { error: "Le nom est obligatoire." };
  if (!Number.isFinite(numero) || numero < 903) {
    return { error: "Le numéro doit être un entier à partir de 903 (901 et 902 sont réservés)." };
  }

  const dejaPris = await queryOne<{ id: string }>("SELECT id FROM benevoles WHERE numero_fixe = ?", [numero]);
  if (dejaPris) return { error: `Le numéro ${numero} est déjà attribué à un autre bénévole.` };

  const edition = await queryOne<{ id: string }>("SELECT id FROM editions WHERE active_flag = 1");

  try {
    await withTransaction(async (conn) => {
      const vendeurId = nouvelId();
      await conn.query("INSERT INTO vendeurs (id, nom) VALUES (?, ?)", [vendeurId, nom]);

      await conn.query("INSERT INTO benevoles (id, vendeur_id, numero_fixe) VALUES (?, ?, ?)", [
        nouvelId(),
        vendeurId,
        numero,
      ]);

      // S'il y a une édition active, le bénévole peut déposer tout de suite
      // — pas besoin d'attendre la prochaine édition.
      if (edition) {
        await conn.query(
          "INSERT INTO participations (id, edition_id, vendeur_id, numero_vendeur, code_confirmation, est_benevole) VALUES (?, ?, ?, ?, ?, 1)",
          [nouvelId(), edition.id, vendeurId, numero, nouveauCode()],
        );
      }
    });
  } catch {
    return { error: "Impossible de créer le bénévole, réessayez." };
  }

  revalidatePath("/gestion/dashboard/benevoles");
  return { error: null };
}
