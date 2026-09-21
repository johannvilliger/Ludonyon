-- Instantané pris au moment où l'étiquette d'un article précis est
-- imprimée (nom + prix + horodatage) — comparé à l'état actuel de
-- l'article pour afficher un statut (jamais imprimée / imprimée / modifiée
-- depuis impression) sur /benevole/liste, principalement pour 901/902
-- (Ludothèque, Dons Ludothèque) qui impriment leurs étiquettes par lots
-- successifs via /benevole/etiquettes plutôt qu'en une fois.
ALTER TABLE articles
  ADD COLUMN etiquette_nom_imprime VARCHAR(255) NULL,
  ADD COLUMN etiquette_prix_imprime INT NULL,
  ADD COLUMN etiquette_imprimee_le DATETIME NULL;
