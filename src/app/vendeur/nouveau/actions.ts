"use server";

import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";

export type FormState = { error: string | null };

type ArticleInput = { nom: string; prix: number };

export async function soumettreListe(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
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
    .filter((a) => a.nom.length > 0 && Number.isFinite(a.prix) && a.prix >= 0);

  if (!nom) return { error: "Le nom est obligatoire." };
  if (articles.length === 0) return { error: "Ajoute au moins un article." };
  if (articles.length > 30) return { error: "30 articles maximum par liste." };

  const supabase = createServiceClient();

  const { data: edition, error: editionError } = await supabase
    .from("editions")
    .select("id")
    .eq("statut", "ouverte")
    .single();

  if (editionError || !edition) {
    return { error: "Aucune édition n'est ouverte aux dépôts pour le moment." };
  }

  const { data: vendeur, error: vendeurError } = await supabase
    .from("vendeurs")
    .insert({ nom, telephone: telephone || null, email: email || null })
    .select("id")
    .single();

  if (vendeurError || !vendeur) {
    return { error: "Impossible d'enregistrer tes coordonnées, réessaie." };
  }

  const { data: participation, error: participationError } = await supabase
    .from("participations")
    .insert({ edition_id: edition.id, vendeur_id: vendeur.id })
    .select("id, code_confirmation")
    .single();

  if (participationError || !participation) {
    return { error: "Impossible de créer ta participation, réessaie." };
  }

  const { error: articlesError } = await supabase.from("articles").insert(
    articles.map((a, i) => ({
      participation_id: participation.id,
      numero_article: i + 1,
      nom: a.nom,
      prix: a.prix,
    })),
  );

  if (articlesError) {
    return { error: "Impossible d'enregistrer les articles, réessaie." };
  }

  redirect(`/vendeur/confirmation/${participation.code_confirmation}`);
}
