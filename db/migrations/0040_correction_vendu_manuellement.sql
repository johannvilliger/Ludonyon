-- Correction de clôture : un objet marqué invendu mais retrouvé manquant au
-- contrôle physique (vendu sans avoir été scanné à la caisse) peut être
-- repassé "vendu" manuellement depuis /gestion/dashboard/vendeurs/[id]/corriger,
-- avec une note obligatoire.
--
-- vendu_manuellement distingue cette correction d'une vraie vente encaissée
-- (jamais de ligne vente_articles derrière, aucun argent réellement
-- encaissé) : sert à l'affichage ("correction manuelle" plutôt que "vendu")
-- et permet d'annuler proprement la correction (retour à invendu) sans
-- jamais toucher à un historique de caisse réel.
ALTER TABLE articles
  ADD COLUMN vendu_manuellement TINYINT(1) NOT NULL DEFAULT 0 AFTER statut,
  ADD COLUMN note_correction VARCHAR(255) NULL AFTER vendu_manuellement;
