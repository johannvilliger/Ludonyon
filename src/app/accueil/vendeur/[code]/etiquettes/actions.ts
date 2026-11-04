"use server";

import { query, queryOne, nouvelId } from "@/lib/db";
import { accueilEstConnecte } from "@/lib/gestion";
import type { ContenuEtiquettesArticles } from "@/lib/etiquettes-articles-impression";

// Dépose la feuille (déjà composée côté client — copies et étiquettes
// "texte seul" déjà développées, voir etiquettes-vendeur.tsx) dans la file
// d'attente lue par print-agent (voir migration 0033). N'imprime rien
// elle-même : juste un INSERT, comme pour les tickets de caisse
// (caisse/[numero]/actions.ts).
export async function envoyerEtiquettesImpression(code: string, contenu: ContenuEtiquettesArticles): Promise<void> {
  if (!(await accueilEstConnecte())) throw new Error("Non autorisé.");

  const participation = await queryOne<{ id: string }>(
    "SELECT id FROM participations WHERE code_confirmation = ?",
    [code],
  );
  if (!participation) throw new Error("Vendeur introuvable.");

  if (contenu.cases.length === 0) throw new Error("Aucune étiquette à imprimer.");

  await query(
    "INSERT INTO etiquettes_articles_impression (id, participation_id, numero_vendeur, contenu_json) VALUES (?, ?, ?, ?)",
    [nouvelId(), participation.id, contenu.numeroVendeur, JSON.stringify(contenu)],
  );
}
