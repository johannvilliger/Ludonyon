-- Permet de fermer manuellement les nouvelles inscriptions en ligne
-- (/vendeur/nouveau) indépendamment de la phase de l'édition — contrairement
-- à modifications_bloquees (migration 0026), qui ne bloque QUE l'édition
-- d'une liste déjà soumise, jamais les nouvelles soumissions.
ALTER TABLE parametres_gestion
  ADD COLUMN inscriptions_fermees TINYINT(1) NOT NULL DEFAULT 0;
