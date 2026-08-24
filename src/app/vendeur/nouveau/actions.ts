"use server";

import { redirect } from "next/navigation";
import { assignerNumeroVendeur, nouveauCode, nouvelId, queryOne, withTransaction } from "@/lib/db";
import { messageMotInterdit, motInterdit } from "@/lib/articles-interdits";

export type FormState = { error: string | null };

type ArticleInput = { nom: string; prix: number };

export async function soumettreListe(_prevState: FormState, formData: FormData): Promise<FormState> {
  // Honeypot anti-spam : champ masqué visuellement (voir page.tsx) qu'un
  // vrai visiteur ne peut pas remplir, mais que la plupart des bots
  // remplissent automatiquement. On rejette silencieusement, sans indice
  // sur la vraie cause, pour ne pas aider un bot à s'adapter.
  if (String(formData.get("site_web") ?? "").trim() !== "") {
    return { error: "Impossible d'enregistrer votre liste, réessayez." };
  }

  const nom = String(formData.get("nom") ?? "").trim();
  const telephone = String(formData.get("telephone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

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
    .filter((a) => a.nom.length > 0 && Number.isFinite(a.prix));

  if (!nom) return { error: "Le nom est obligatoire." };
  if (!telephone) return { error: "Le téléphone est obligatoire." };
  if (articles.length === 0) return { error: "Ajoutez au moins un article." };
  if (articles.length > 30) return { error: "30 articles maximum par liste." };

  for (const a of articles) {
    const mot = motInterdit(a.nom);
    if (mot) return { error: messageMotInterdit(mot) };
    if (a.prix <= 0) return { error: `Indiquez un prix supérieur à 0.– pour « ${a.nom} ».` };
  }

  const edition = await queryOne<{ id: string }>("SELECT id FROM editions WHERE phase = 'depot' LIMIT 1");
  if (!edition) {
    return { error: "Le dépôt en ligne n'est pas ouvert pour le moment — passez par l'accueil sur place." };
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
        "INSERT INTO participations (id, edition_id, vendeur_id, numero_vendeur, code_confirmation) VALUES (?, ?, ?, ?, ?)",
        [participationId, edition.id, vendeurId, numeroVendeur, codeConfirmation],
      );

      for (const [i, a] of articles.entries()) {
        await conn.query(
          "INSERT INTO articles (id, participation_id, numero_article, nom, prix) VALUES (?, ?, ?, ?, ?)",
          [nouvelId(), participationId, i + 1, a.nom, a.prix],
        );
      }
    });
  } catch {
    return { error: "Impossible d'enregistrer votre liste, réessayez." };
  }

  redirect(`/vendeur/confirmation/${codeConfirmation}`);
}
