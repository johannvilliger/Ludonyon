-- Verrouille l'accès à /accueil (jusqu'ici sans aucune protection, juste
-- jamais lié publiquement) avec un code partagé, sur le même principe que
-- les codes caisse : plusieurs personnes peuvent l'utiliser en même temps
-- (pas de session exclusive comme pour le dashboard), voir
-- src/lib/gestion.ts.
ALTER TABLE parametres_gestion
  ADD COLUMN code_accueil VARCHAR(50) NOT NULL DEFAULT '7890';
