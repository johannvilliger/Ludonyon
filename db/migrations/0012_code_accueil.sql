-- Verrouille l'accès à /accueil (jusqu'ici sans aucune protection, juste
-- jamais lié publiquement) avec un code partagé, sur le même principe que
-- les codes caisse : plusieurs personnes peuvent l'utiliser en même temps
-- (pas de session exclusive comme pour le dashboard), voir
-- src/lib/gestion.ts.
-- Généré aléatoirement, comme les autres codes (voir 0002_gestion.sql) —
-- jamais de valeur fixe en dur ici.
ALTER TABLE parametres_gestion
  ADD COLUMN code_accueil VARCHAR(50) NOT NULL DEFAULT '';

UPDATE parametres_gestion SET code_accueil = SUBSTRING(MD5(RAND()), 1, 6) WHERE id = 1;
