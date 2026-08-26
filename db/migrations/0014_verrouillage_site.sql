-- Verrouillage complet du site public (tout sauf /gestion) pendant la phase
-- de test/démo avant l'ouverture officielle. Séparé du statut de l'édition
-- pour pouvoir tester avec une édition active sans exposer le site au
-- public : le déverrouillage manuel se cumule avec la règle automatique
-- (édition active = déverrouillé), voir siteTrocOuvert() dans
-- src/lib/gestion.ts. Défaut à 0 : verrouillé tant que personne n'a
-- explicitement déverrouillé depuis le dashboard.
ALTER TABLE parametres_gestion
  ADD COLUMN deverrouille_manuellement TINYINT(1) NOT NULL DEFAULT 0;
