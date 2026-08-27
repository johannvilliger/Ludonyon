"use server";

import { revalidatePath } from "next/cache";
import { nouveauCode, nouvelId, query, queryOne, withTransaction } from "@/lib/db";
import { dashboardEstConnecte } from "@/lib/gestion";
import { hasherMotDePasse } from "@/lib/mot-de-passe";
import { estVendeurSpecial } from "@/lib/vendeurs-speciaux";

export type FormState = { error: string | null };

export async function modifierBenevole(
  benevoleId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const nom = String(formData.get("nom") ?? "").trim();
  const numero = Math.round(Number(formData.get("numero")));
  const motDePasse = String(formData.get("mot_de_passe") ?? "").trim();
  if (!nom) return { error: "Le nom est obligatoire." };
  if (!Number.isFinite(numero) || numero < 903) {
    return { error: "Le numéro doit être un entier à partir de 903 (901 et 902 sont réservés)." };
  }
  if (motDePasse && motDePasse.length < 4) {
    return { error: "Le mot de passe doit faire au moins 4 caractères." };
  }

  const benevole = await queryOne<{ vendeur_id: string; numero_fixe: number }>(
    "SELECT vendeur_id, numero_fixe FROM benevoles WHERE id = ?",
    [benevoleId],
  );
  if (!benevole) return { error: "Bénévole introuvable." };

  if (numero !== benevole.numero_fixe) {
    const dejaPris = await queryOne<{ id: string }>(
      "SELECT id FROM benevoles WHERE numero_fixe = ? AND id != ?",
      [numero, benevoleId],
    );
    if (dejaPris) return { error: `Le numéro ${numero} est déjà attribué à un autre bénévole.` };
  }

  try {
    await withTransaction(async (conn) => {
      await conn.query("UPDATE vendeurs SET nom = ? WHERE id = ?", [nom, benevole.vendeur_id]);
      await conn.query("UPDATE benevoles SET numero_fixe = ? WHERE id = ?", [numero, benevoleId]);
      // Champ laissé vide = on ne touche pas au mot de passe existant.
      if (motDePasse) {
        await conn.query("UPDATE benevoles SET mot_de_passe_hash = ? WHERE id = ?", [
          hasherMotDePasse(motDePasse),
          benevoleId,
        ]);
      }
      // Garde participations.numero_vendeur (copie figée par édition) en
      // phase avec le numéro fixe du bénévole, sur toutes les éditions —
      // pas de raison qu'ils divergent.
      if (numero !== benevole.numero_fixe) {
        await conn.query(
          "UPDATE participations SET numero_vendeur = ? WHERE vendeur_id = ? AND numero_vendeur = ?",
          [numero, benevole.vendeur_id, benevole.numero_fixe],
        );
      }
    });
  } catch {
    return { error: "Impossible de modifier le bénévole, réessayez." };
  }

  revalidatePath("/gestion/dashboard/benevoles");
  return { error: null };
}

export async function creerBenevole(_prevState: FormState, formData: FormData): Promise<FormState> {
  const nom = String(formData.get("nom") ?? "").trim();
  const numero = Math.round(Number(formData.get("numero")));
  const motDePasse = String(formData.get("mot_de_passe") ?? "").trim();
  if (!nom) return { error: "Le nom est obligatoire." };
  if (!Number.isFinite(numero) || numero < 903) {
    return { error: "Le numéro doit être un entier à partir de 903 (901 et 902 sont réservés)." };
  }
  if (motDePasse.length < 4) {
    return { error: "Le mot de passe doit faire au moins 4 caractères." };
  }

  const dejaPris = await queryOne<{ id: string }>("SELECT id FROM benevoles WHERE numero_fixe = ?", [numero]);
  if (dejaPris) return { error: `Le numéro ${numero} est déjà attribué à un autre bénévole.` };

  const edition = await queryOne<{ id: string }>("SELECT id FROM editions WHERE active_flag = 1");

  try {
    await withTransaction(async (conn) => {
      const vendeurId = nouvelId();
      await conn.query("INSERT INTO vendeurs (id, nom) VALUES (?, ?)", [vendeurId, nom]);

      await conn.query(
        "INSERT INTO benevoles (id, vendeur_id, numero_fixe, mot_de_passe_hash) VALUES (?, ?, ?, ?)",
        [nouvelId(), vendeurId, numero, hasherMotDePasse(motDePasse)],
      );

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

// Supprime un bénévole créé par erreur (doublon...). Efface le vendeur
// associé, ce qui entraîne en cascade ses participations/articles sur
// toutes les éditions (FK ON DELETE CASCADE) — mais bloque tout seul
// (contrainte FK sans cascade) si un de ses articles a déjà été vendu ou si
// une clôture a été enregistrée pour lui sur une édition quelconque : pas
// de perte de données réelles possible via ce bouton, seulement des
// bénévoles encore "vides".
export async function supprimerBenevole(benevoleId: string): Promise<FormState> {
  if (!(await dashboardEstConnecte())) throw new Error("Non autorisé.");

  const benevole = await queryOne<{ vendeur_id: string; numero_fixe: number }>(
    "SELECT vendeur_id, numero_fixe FROM benevoles WHERE id = ?",
    [benevoleId],
  );
  if (!benevole) return { error: "Bénévole introuvable." };
  if (estVendeurSpecial(benevole.numero_fixe)) return { error: "Ce bénévole système ne peut pas être supprimé." };

  try {
    await query("DELETE FROM vendeurs WHERE id = ?", [benevole.vendeur_id]);
  } catch {
    return {
      error:
        "Impossible de supprimer : ce bénévole a déjà des articles vendus ou une clôture enregistrée sur une édition.",
    };
  }

  revalidatePath("/gestion/dashboard/benevoles");
  return { error: null };
}
