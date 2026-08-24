-- Clôture individuelle des caisses, instructions d'ouverture affichées une
-- fois par édition et par caisse, et simplification du statut des articles
-- pour la réception (non_recu -> recu -> vendu, ou invendu en fin d'édition).

ALTER TABLE caisses
  ADD COLUMN cloturee TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN instructions_vues TINYINT(1) NOT NULL DEFAULT 0;

-- Ancien statut plus fin (soumis/etiquete/controle/en_vente/vendu/
-- invendu_recupere/invendu_donne) jamais réellement piloté en dehors de
-- « soumis » et « vendu ». On le ramène à 4 états utiles : non reçu à
-- l'accueil, reçu (étiquette collée), vendu, invendu (en fin d'édition).
ALTER TABLE articles MODIFY COLUMN statut VARCHAR(20) NOT NULL DEFAULT 'soumis';

UPDATE articles SET statut = CASE
  WHEN statut = 'vendu' THEN 'vendu'
  WHEN statut IN ('invendu_recupere', 'invendu_donne', 'invendu') THEN 'invendu'
  WHEN statut = 'recu' THEN 'recu'
  ELSE 'non_recu'
END;

ALTER TABLE articles
  MODIFY COLUMN statut ENUM('non_recu', 'recu', 'vendu', 'invendu') NOT NULL DEFAULT 'non_recu';
