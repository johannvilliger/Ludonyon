-- Bug d'impression en masse : l'impression centralisée d'une plage de
-- vendeurs (envoyerEtiquettesPlage) insère toutes les feuilles de la plage
-- en une fraction de seconde, dans la même transaction — avec created_at en
-- résolution à la seconde (DATETIME), plusieurs feuilles partagent souvent
-- le même instant, et "ORDER BY created_at ASC" (voir
-- /api/etiquettes-articles/en-attente) devient alors un tri instable entre
-- elles : print-agent recevait les feuilles dans un ordre quasi aléatoire
-- au lieu de 1, 2, 3...
--
-- AUTO_INCREMENT garantit l'ordre d'insertion exact, indépendamment de toute
-- résolution d'horloge — contrairement à id (UUID, voir migration 0033),
-- qui ne reflète aucun ordre.
ALTER TABLE etiquettes_articles_impression
  ADD COLUMN ordre INT NOT NULL AUTO_INCREMENT UNIQUE AFTER id;
