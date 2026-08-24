"use server";

import { createServiceClient } from "@/lib/supabase/server";

export type ArticleTrouve = {
  articleId: string;
  numeroVendeur: number;
  numeroArticle: number;
  nomVendeur: string;
  nom: string;
  prix: number;
  estBenevole: boolean;
};

export type RechercheResult = { ok: true; article: ArticleTrouve } | { ok: false; error: string };

export async function rechercherArticle(editionId: string, codeBrut: string): Promise<RechercheResult> {
  const match = codeBrut.trim().match(/^(\d+)-(\d+)-(\d+)$/);
  if (!match) return { ok: false, error: `Code illisible : « ${codeBrut} »` };

  const numeroVendeur = Number(match[1]);
  const numeroArticle = Number(match[2]);
  const prixScanne = Number(match[3]);

  const supabase = createServiceClient();

  const { data: participation } = await supabase
    .from("participations")
    .select("id, est_benevole, vendeurs(nom)")
    .eq("edition_id", editionId)
    .eq("numero_vendeur", numeroVendeur)
    .single<{ id: string; est_benevole: boolean; vendeurs: { nom: string } }>();

  if (!participation) return { ok: false, error: `Vendeur n° ${numeroVendeur} introuvable.` };

  const { data: article } = await supabase
    .from("articles")
    .select("id, numero_article, nom, prix")
    .eq("participation_id", participation.id)
    .eq("numero_article", numeroArticle)
    .single<{ id: string; numero_article: number; nom: string; prix: number }>();

  if (!article) return { ok: false, error: `Article n° ${numeroArticle} introuvable pour le vendeur ${numeroVendeur}.` };

  if (article.prix !== prixScanne) {
    return {
      ok: false,
      error: `Prix incohérent sur « ${article.nom} » : étiquette ${prixScanne}.– mais liste ${article.prix}.– — vérifie l'objet avant d'encaisser.`,
    };
  }

  const { data: dejaVendu } = await supabase
    .from("vente_articles")
    .select("id")
    .eq("article_id", article.id)
    .maybeSingle();

  if (dejaVendu) {
    return { ok: false, error: `« ${article.nom} » (vendeur n° ${numeroVendeur}) a déjà été vendu.` };
  }

  return {
    ok: true,
    article: {
      articleId: article.id,
      numeroVendeur,
      numeroArticle: article.numero_article,
      nomVendeur: participation.vendeurs.nom,
      nom: article.nom,
      prix: article.prix,
      estBenevole: participation.est_benevole,
    },
  };
}

export type EncaissementResult = { ok: true; total: number } | { ok: false; error: string };

export async function encaisserPanier(
  caisseId: string,
  editionId: string,
  acheteurBenevole: boolean,
  articleIds: string[],
): Promise<EncaissementResult> {
  if (articleIds.length === 0) return { ok: false, error: "Le panier est vide." };

  const supabase = createServiceClient();

  const { data: edition } = await supabase
    .from("editions")
    .select("taux_achat")
    .eq("id", editionId)
    .single<{ taux_achat: number }>();

  if (!edition) return { ok: false, error: "Édition introuvable." };

  const { data: articles } = await supabase
    .from("articles")
    .select("id, prix")
    .in("id", articleIds)
    .returns<{ id: string; prix: number }[]>();

  if (!articles || articles.length !== articleIds.length) {
    return { ok: false, error: "Un des articles du panier n'existe plus." };
  }

  const { data: vente, error: venteError } = await supabase
    .from("ventes")
    .insert({ caisse_id: caisseId, edition_id: editionId, acheteur_benevole: acheteurBenevole })
    .select("id")
    .single();

  if (venteError || !vente) return { ok: false, error: "Impossible de créer la vente, réessaie." };

  const lignes = articles.map((a) => ({
    vente_id: vente.id,
    article_id: a.id,
    prix_encaisse: acheteurBenevole ? a.prix : Math.round(a.prix * (1 + edition.taux_achat)),
  }));

  const { error: lignesError } = await supabase.from("vente_articles").insert(lignes);

  if (lignesError) {
    await supabase.from("ventes").delete().eq("id", vente.id);
    return {
      ok: false,
      error: "Un des articles vient d'être vendu depuis une autre caisse entre-temps — retire-le du panier et réessaie.",
    };
  }

  await supabase.from("articles").update({ statut: "vendu" }).in("id", articleIds);

  const total = lignes.reduce((sum, l) => sum + l.prix_encaisse, 0);
  return { ok: true, total };
}
