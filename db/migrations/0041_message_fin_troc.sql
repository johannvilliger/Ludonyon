-- Message de clôture affiché sur la page d'accueil publique une fois
-- l'édition en phase post-vente (voir src/app/page.tsx) — même principe
-- que message_depot_termine (migration 0025), mais un champ distinct : pas
-- le même texte ni la même phase de déclenchement, et celui-ci dépouille la
-- page (plus de lien "Comment ça marche", plus de login bénévole, voir
-- SiteHeader) plutôt que de se contenter de remplacer un paragraphe.
ALTER TABLE parametres_gestion
  ADD COLUMN message_fin_troc TEXT NULL;
