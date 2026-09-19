-- Bloque uniquement les MODIFICATIONS de liste en ligne (jamais les
-- nouvelles soumissions) — un bouton dashboard indépendant de la phase de
-- l'édition, pour figer les listes le temps de les imprimer avant l'accueil
-- sans empêcher un vendeur retardataire de s'inscrire (voir
-- vendeur/modifier/[code]/actions.ts et src/lib/gestion.ts).
ALTER TABLE parametres_gestion
  ADD COLUMN modifications_bloquees TINYINT(1) NOT NULL DEFAULT 0;

-- Instantané de la liste au moment de la dernière impression (voir
-- gestion/dashboard/vendeurs/[participationId]/imprimer) : comparé à la
-- liste actuelle pour savoir si elle a été modifiée depuis et surligner ce
-- qui a changé, sans maintenir un statut séparé qui pourrait se
-- désynchroniser de la réalité.
ALTER TABLE participations
  ADD COLUMN articles_imprimes_json TEXT NULL,
  ADD COLUMN imprimee_le DATETIME NULL;
