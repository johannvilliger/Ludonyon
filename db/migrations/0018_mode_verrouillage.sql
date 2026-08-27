-- Le bouton de verrouillage du site public ne pouvait que déverrouiller
-- manuellement (pour tester/démontrer sans édition active) — jamais forcer
-- le verrouillage malgré une édition active. Passe à un contrôle à 3 états
-- pour permettre aussi ce cas : tests en conditions réelles un week-end
-- avec une édition ouverte, sans exposer le site au public entre-temps.
ALTER TABLE parametres_gestion
  ADD COLUMN mode_verrouillage ENUM('auto', 'deverrouille', 'verrouille') NOT NULL DEFAULT 'auto';

UPDATE parametres_gestion SET mode_verrouillage = 'deverrouille' WHERE deverrouille_manuellement = 1;

ALTER TABLE parametres_gestion
  DROP COLUMN deverrouille_manuellement;
