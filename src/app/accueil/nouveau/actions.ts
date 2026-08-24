"use server";

import { redirect } from "next/navigation";
import { assignerNumeroVendeur, nouveauCode, nouvelId, queryOne, withTransaction } from "@/lib/db";
import { messageMotInterdit, motInterdit } from "@/lib/articles-interdits";

export type FormState = { error: string | null };

type ArticleInput = { nom: string; prix: number };

export async function creerListeAccueil(_prevState: FormState, formData: FormData): Promise<FormState> {
  const nom = String(formData.get("nom") ?? "").trim();
  const telephone = String(formData.get("telephone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const estBenevole = formData.get("est_benevole") === "on";

  let articlesRaw: unknown;
  try {
    articlesRaw = JSON.parse(String(formData.get("articles") ?? "[]"));
  } catch {
    return { error: "Liste d'articles invalide." };
  }

  const articles: ArticleInput[] = (Array.isArray(articlesRaw) ? articlesRaw : [])
    .map((a) => ({
      nom: String((a as ArticleInput)?.nom ?? "").trim(),
      prix: Math.round(Number((a as ArticleInput)?.prix)),
    }))
    .filter((a) => a.nom.length > 0 && Number.isFinite(a.prix) && a.prix >= 0);

  if (!nom) return { error: "Le nom est obligatoire." };
  if (articles.length === 0) return { error: "Ajoute au moins un article." };
  if (articles.length > 30) return { error: "30 articles maximum par liste." };

  for (const a of articles) {
    const mot = motInterdit(a.nom);
    if (mot) return { error: messageMotInterdit(mot) };
  }

  const edition = await queryOne<{ id: string }>("SELECT id FROM editions WHERE active_flag = 1 LIMIT 1");
  if (!edition) {
    return { error: "Aucune édition active pour le moment." };
  }

  let codeConfirmation = "";

  try {
    await withTransaction(async (conn) => {
      const vendeurId = nouvelId();
      await conn.query("INSERT INTO vendeurs (id, nom, telephone, email) VALUES (?, ?, ?, ?)", [
        vendeurId,
        nom,
        telephone || null,
        email || null,
      ]);

      const numeroVendeur = await assignerNumeroVendeur(conn, edition.id);
      const participationId = nouvelId();
      codeConfirmation = nouveauCode();

      await conn.query(
        "INSERT INTO participations (id, edition_id, vendeur_id, numero_vendeur, code_confirmation, est_benevole) VALUES (?, ?, ?, ?, ?, ?)",
        [participationId, edition.id, vendeurId, numeroVendeur, codeConfirmation, estBenevole],
      );

      for (const [i, a] of articles.entries()) {
        await conn.query(
          "INSERT INTO articles (id, participation_id, numero_article, nom, prix) VALUES (?, ?, ?, ?, ?)",
          [nouvelId(), participationId, i + 1, a.nom, a.prix],
        );
      }
    });
  } catch {
    return { error: "Impossible d'enregistrer la liste, réessaie." };
  }

  redirect(`/accueil/vendeur/${codeConfirmation}`);
}
