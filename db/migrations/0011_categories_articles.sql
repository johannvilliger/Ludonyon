-- Catégories fixes pour le classement automatique des articles (voir
-- /gestion/dashboard/vendeurs). Désormais semées automatiquement à chaque
-- création d'édition (voir creerEdition), mais rattrapées ici pour
-- l'édition déjà en cours au moment où cette fonctionnalité arrive —
-- idempotent, sans rien faire pour les éditions déjà terminées.
INSERT INTO categories (id, edition_id, nom, ordre)
SELECT UUID(), e.id, c.nom, c.ordre
FROM editions e
CROSS JOIN (
  SELECT 'Jeux' AS nom, 0 AS ordre
  UNION ALL SELECT 'Jouets', 1
  UNION ALL SELECT 'Puériculture', 2
  UNION ALL SELECT 'Puzzle', 3
  UNION ALL SELECT 'Livres', 4
  UNION ALL SELECT 'Sport', 5
  UNION ALL SELECT 'Autre', 6
) c
WHERE e.active_flag = 1
  AND NOT EXISTS (
    SELECT 1 FROM categories cat WHERE cat.edition_id = e.id AND cat.nom = c.nom
  );
