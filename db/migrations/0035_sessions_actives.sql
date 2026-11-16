-- Remplace le suivi "sessions actives" (formulaires de dépôt/modification de
-- liste en cours de remplissage, affiché sur /gestion/dashboard) qui vivait
-- en mémoire du processus Node (voir sessions-actives.ts) — invisible dès
-- que l'écriture (battement du navigateur du vendeur) et la lecture
-- (chargement du dashboard) n'atterrissent pas sur le même processus, ce
-- qui semble être le cas en permanence sur cet hébergement. Stocké ici en
-- base, partagée par tous les processus quels qu'ils soient.
CREATE TABLE IF NOT EXISTS sessions_actives (
  cle VARCHAR(36) NOT NULL PRIMARY KEY,
  label VARCHAR(200) NOT NULL,
  derniere_activite DATETIME NOT NULL
) ENGINE = InnoDB;
