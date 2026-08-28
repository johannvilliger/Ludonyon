-- Espace remboursement : un acheteur peut ramener un article "en cas de
-- problème" et se faire rembourser. Ça annule la vente dans les
-- bilans/résumés, mais l'argent rendu sort d'un poste dédié — jamais des
-- transactions de la caisse de vente d'origine (voir remboursements
-- ci-dessous et la note sur article_id_libre).
ALTER TABLE postes_caisse
  ADD COLUMN type ENUM('vente', 'remboursement') NOT NULL DEFAULT 'vente';

INSERT INTO postes_caisse (id, numero, code_acces, type) VALUES (UUID(), 6, 'REMB-8146', 'remboursement');

-- Un article remboursé redevient disponible à la vente (articles.statut
-- repasse à 'recu', peut être re-scanné et revendu) — mais la ligne de
-- vente d'origine dans vente_articles ne doit JAMAIS être supprimée : elle
-- reste l'historique exact de ce que sa caisse de vente a réellement
-- encaissé ce jour-là, pour que le théorique/écart de cette caisse à sa
-- clôture ne change jamais rétroactivement à cause d'un remboursement
-- traité ailleurs, plus tard. On la marque juste remboursée.
--
-- article_id_libre porte l'unicité "vente active" pour un article : mis à
-- article_id par l'application à l'encaissement, remis à NULL par
-- l'application lors du remboursement. On voulait au départ une colonne
-- GENERATED ALWAYS AS (comme editions.active_flag, migration 0004), mais
-- cette version de MariaDB (10.11) refuse catégoriquement d'indexer une
-- colonne générée dont l'expression copie une valeur CHAR(36) (testé avec
-- IF/CONCAT/CAST AS CHAR/CAST AS BINARY — erreur 1901 à chaque fois, alors
-- que le même mécanisme fonctionne avec un TINYINT comme active_flag). Une
-- colonne ordinaire gérée par l'application, avec un index unique dessus,
-- offre exactement la même garantie anti-double-vente au niveau base de
-- données, sans cette limitation.
ALTER TABLE vente_articles
  ADD COLUMN remboursee_le DATETIME NULL,
  ADD COLUMN article_id_libre CHAR(36) NULL;

UPDATE vente_articles SET article_id_libre = article_id;

-- L'index de vente_articles_article_uk sert aussi à la clé étrangère sur
-- article_id ; il faut retirer la FK avant de pouvoir remplacer cet index,
-- puis la remettre.
ALTER TABLE vente_articles
  DROP FOREIGN KEY vente_articles_ibfk_2;

ALTER TABLE vente_articles
  DROP KEY vente_articles_article_uk,
  ADD UNIQUE KEY vente_articles_article_libre_uk (article_id_libre);

ALTER TABLE vente_articles
  ADD CONSTRAINT vente_articles_ibfk_2 FOREIGN KEY (article_id) REFERENCES articles(id);

-- Le montant rendu n'est pas dupliqué ici : toujours re-dérivé de
-- vente_articles.prix_encaisse (immuable) via la jointure — une seule
-- source de vérité, comme pour les quittances.
CREATE TABLE remboursements (
  id CHAR(36) NOT NULL PRIMARY KEY,
  vente_article_id CHAR(36) NOT NULL,
  caisse_id CHAR(36) NOT NULL,
  effectue_par VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vente_article_id) REFERENCES vente_articles(id),
  FOREIGN KEY (caisse_id) REFERENCES caisses(id)
) ENGINE = InnoDB;
