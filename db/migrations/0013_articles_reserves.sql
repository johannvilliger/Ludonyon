-- Le panier d'une caisse est purement côté client (état React) jusqu'ici :
-- rien n'empêchait deux caissiers de scanner le même article dans deux
-- paniers différents avant que l'un des deux encaisse. Cette table
-- matérialise une réservation exclusive dès qu'un article est ajouté à un
-- panier (voir rechercherArticle) — la clé primaire sur article_id fait
-- respecter l'exclusivité par la base elle-même, pas par une vérification
-- applicative sujette aux courses. Une réservation trop ancienne (caissier
-- qui a scanné puis rechargé sans vider son panier) est ignorée et
-- remplacée automatiquement plutôt que de bloquer l'article indéfiniment.
CREATE TABLE articles_reserves (
  article_id CHAR(36) NOT NULL PRIMARY KEY,
  caisse_id CHAR(36) NOT NULL,
  reserve_le DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (caisse_id) REFERENCES caisses(id) ON DELETE CASCADE
) ENGINE = InnoDB;
