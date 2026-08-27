-- Les montants encaissés/comptés en espèces dépendent des taux d'achat/vente
-- (±10%) appliqués à un prix entier : le résultat a presque toujours des
-- centimes (5.– devient 5.50 à l'achat, 4.50 pour le vendeur). Ces colonnes
-- étaient en INT (arrondi au franc, perte des centimes) — passage en
-- DECIMAL(10,2), rétrocompatible avec les valeurs entières déjà stockées.
-- articles.prix reste en INT : c'est le prix affiché par le vendeur,
-- toujours un nombre de francs entier par choix (voir ArticleListEditor).
ALTER TABLE vente_articles
  MODIFY COLUMN prix_encaisse DECIMAL(10, 2) NOT NULL;

ALTER TABLE mouvements_caisse
  MODIFY COLUMN montant DECIMAL(10, 2) NOT NULL CHECK (montant > 0);

ALTER TABLE caisses
  MODIFY COLUMN fond_initial DECIMAL(10, 2) NOT NULL DEFAULT 250,
  MODIFY COLUMN montant_cloture DECIMAL(10, 2) NULL;
