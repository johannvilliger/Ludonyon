"use server";

import { redirect } from "next/navigation";
import { assignerNumeroVendeur, nouveauCode, nouvelId, queryOne, withTransaction } from "@/lib/db";
import { messageMotInterdit, motInterdit } from "@/lib/articles-interdits";
import { envoyerEmailConfirmationListe } from "@/lib/email";
import { accueilEstConnecte } from "@/lib/gestion";
import { urlAbsolue } from "@/lib/url";

export type FormState = { error: string | null };

type ArticleInput = { nom: string; prix: number };

export async function creerListeAccueil(_prevState: FormState, formData: FormData): Promise<FormState> {
  if (!(await accueilEstConnecte())) return { error: "Non autorisé." };

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

  const edition = await queryOne<{ id: string }>("SELECT id FROM editions WHERE active_flag = 1 LIMIT 1");
  if (!edition) {
    return { error: "Aucune édition active pour le moment." };
  }

  let codeConfirmation = "";
  let numeroVendeurAttribue = 0;

  try {
    await withTransaction(async (conn) => {
      const vendeurId = nouvelId();
      await conn.query("INSERT INTO vendeurs (id, nom, telephone, email) VALUES (?, ?, ?, ?)", [
        vendeurId,
        nom,
        telephone || null,
        email || null,
      ]);

      numeroVendeurAttribue = await assignerNumeroVendeur(conn, edition.id);
      const participationId = nouvelId();
      codeConfirmation = nouveauCode();

      await conn.query(
        "INSERT INTO participations (id, edition_id, vendeur_id, numero_vendeur, code_confirmation, est_benevole) VALUES (?, ?, ?, ?, ?, ?)",
        [participationId, edition.id, vendeurId, numeroVendeurAttribue, codeConfirmation, estBenevole],
      );

      for (const [i, a] of articles.entries()) {
        await conn.query(
          "INSERT INTO articles (id, participation_id, numero_article, nom, prix) VALUES (?, ?, ?, ?, ?)",
          [nouvelId(), participationId, i + 1, a.nom, a.prix],
        );
      }
    });
  } catch {
    return { error: "Impossible d'enregistrer la liste, réessayez." };
  }

  if (email) {
    await envoyerEmailConfirmationListe({
      destinataire: email,
      nomVendeur: nom,
      numeroVendeur: numeroVendeurAttribue,
      codeConfirmation,
      lienConfirmation: await urlAbsolue(`/vendeur/confirmation/${codeConfirmation}`),
      lienModifier: await urlAbsolue(`/vendeur/modifier/${codeConfirmation}`),
    });
  }

  redirect(`/accueil/vendeur/${codeConfirmation}`);
}
