-- Renomme "Jeux" en "Jeux de société" et ajoute 7 nouvelles catégories
-- (Lego, Construction, Playmobil, Garages (voitures), Jouets en bois,
-- Poupées, Jouets 1er âge) — même pattern que la migration 0011 : rattrape
-- l'édition active (idempotent), une nouvelle édition se seedera
-- directement avec la liste à jour via creerEdition / lib/categories.ts.
UPDATE categories SET nom = 'Jeux de société', ordre = 0 WHERE nom = 'Jeux';
UPDATE categories SET ordre = 4 WHERE nom = 'Jouets';
UPDATE categories SET ordre = 9 WHERE nom = 'Puériculture';
UPDATE categories SET ordre = 10 WHERE nom = 'Puzzle';
UPDATE categories SET ordre = 11 WHERE nom = 'Livres';
UPDATE categories SET ordre = 12 WHERE nom = 'Sport';
UPDATE categories SET ordre = 13 WHERE nom = 'Autre';

INSERT INTO categories (id, edition_id, nom, ordre)
SELECT UUID(), e.id, c.nom, c.ordre
FROM editions e
CROSS JOIN (
  SELECT 'Lego' AS nom, 1 AS ordre
  UNION ALL SELECT 'Construction', 2
  UNION ALL SELECT 'Playmobil', 3
  UNION ALL SELECT 'Garages (voitures)', 5
  UNION ALL SELECT 'Jouets en bois', 6
  UNION ALL SELECT 'Poupées', 7
  UNION ALL SELECT 'Jouets 1er âge', 8
) c
WHERE e.active_flag = 1
  AND NOT EXISTS (
    SELECT 1 FROM categories cat WHERE cat.edition_id = e.id AND cat.nom = c.nom
  );
