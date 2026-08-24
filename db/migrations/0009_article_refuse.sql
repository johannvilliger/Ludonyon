-- Réception : bouton « Refuser » pour un article en mauvais état / sale /
-- cassé. Un article refusé est repris par le vendeur et n'est jamais mis en
-- vente — statut terminal distinct de « invendu » (qui, lui, désigne un
-- article resté en vente jusqu'à la fin de l'édition sans trouver preneur).
ALTER TABLE articles
  MODIFY COLUMN statut ENUM('non_recu', 'recu', 'vendu', 'invendu', 'refuse') NOT NULL DEFAULT 'non_recu';
