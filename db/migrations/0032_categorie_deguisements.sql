-- Ajoute la catégorie "Déguisements" (costumes, masques, kits de jeu de
-- rôle — constat fait en analysant les articles tombés en "Autre") et
-- réordonne en conséquence pour l'édition active. Même pattern que les
-- migrations 0011/0031 — idempotent ; une nouvelle édition se seedera
-- directement avec la liste à jour via creerEdition / lib/categories.ts.
UPDATE categories SET ordre = 6 WHERE nom = 'Garages (voitures)';
UPDATE categories SET ordre = 7 WHERE nom = 'Jouets en bois';
UPDATE categories SET ordre = 8 WHERE nom = 'Poupées';
UPDATE categories SET ordre = 9 WHERE nom = 'Jouets 1er âge';
UPDATE categories SET ordre = 10 WHERE nom = 'Puériculture';
UPDATE categories SET ordre = 11 WHERE nom = 'Puzzle';
UPDATE categories SET ordre = 12 WHERE nom = 'Livres';
UPDATE categories SET ordre = 13 WHERE nom = 'Sport';
UPDATE categories SET ordre = 14 WHERE nom = 'Autre';

INSERT INTO categories (id, edition_id, nom, ordre)
SELECT UUID(), e.id, 'Déguisements', 5
FROM editions e
WHERE e.active_flag = 1
  AND NOT EXISTS (
    SELECT 1 FROM categories cat WHERE cat.edition_id = e.id AND cat.nom = 'Déguisements'
  );
