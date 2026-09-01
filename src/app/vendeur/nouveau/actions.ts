"use server";

import { redirect } from "next/navigation";
import { assignerNumeroVendeur, nouveauCode, nouvelId, queryOne, withTransaction } from "@/lib/db";
import { envoyerEmailConfirmationListe } from "@/lib/email";
import { emailValide } from "@/lib/email-format";
import { formaterTelephone, telephoneValide } from "@/lib/telephone";
import { urlAbsolue } from "@/lib/url";
import { erreurArticles } from "@/lib/validation-articles";

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
  const telephone = formaterTelephone(String(formData.get("telephone") ?? ""));
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

  const conditionsAcceptees = formData.get("conditions") === "on";

  if (!nom) return { error: "Le nom est obligatoire." };
  if (nom.length < 3) return { error: "Le nom doit contenir au moins 3 caractères." };
  if (!telephone) return { error: "Le téléphone est obligatoire." };
  if (!telephoneValide(telephone)) {
    return { error: "Merci d'indiquer un numéro de portable valide (suisse 07x ou français +33 6/7)." };
  }
  if (!email) return { error: "L'email est obligatoire." };
  if (!emailValide(email)) return { error: "Merci d'indiquer une adresse email valide." };
  if (!conditionsAcceptees) return { error: "Vous devez accepter les conditions pour continuer." };
  if (articles.length === 0) return { error: "Ajoutez au moins un article." };
  if (articles.length > 30) return { error: "30 articles maximum par liste." };

  const erreurArticle = erreurArticles(articles);
  if (erreurArticle) return { error: erreurArticle };

  const edition = await queryOne<{ id: string; taux_achat: number; taux_vendeur: number }>(
    "SELECT id, taux_achat, taux_vendeur FROM editions WHERE phase = 'depot' LIMIT 1",
  );
  if (!edition) {
    return { error: "Le dépôt en ligne n'est pas ouvert pour le moment — passez par l'accueil sur place." };
  }

  let codeConfirmation = "";
  let numeroVendeurAttribue = 0;

  try {
    await withTransaction(async (conn) => {
      const vendeurId = nouvelId();
      await conn.query("INSERT INTO vendeurs (id, nom, telephone, email) VALUES (?, ?, ?, ?)", [
        vendeurId,
        nom,
        telephone,
        email,
      ]);

      numeroVendeurAttribue = await assignerNumeroVendeur(conn, edition.id);
      const participationId = nouvelId();
      codeConfirmation = nouveauCode();

      await conn.query(
        "INSERT INTO participations (id, edition_id, vendeur_id, numero_vendeur, code_confirmation) VALUES (?, ?, ?, ?, ?)",
        [participationId, edition.id, vendeurId, numeroVendeurAttribue, codeConfirmation],
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

  await envoyerEmailConfirmationListe({
    destinataire: email,
    nomVendeur: nom,
    numeroVendeur: numeroVendeurAttribue,
    codeConfirmation,
    lienConfirmation: await urlAbsolue(`/vendeur/confirmation/${codeConfirmation}`),
    lienModifier: await urlAbsolue(`/vendeur/modifier/${codeConfirmation}`),
    tauxAchat: Number(edition.taux_achat),
    tauxVendeur: Number(edition.taux_vendeur),
  });

  redirect(`/vendeur/confirmation/${codeConfirmation}`);
}
