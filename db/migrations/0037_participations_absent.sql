-- Vendeur jamais passé par l'accueil (no-show) : on ne supprime jamais sa
-- participation (liste/articles saisis en ligne gardés pour archive), on le
-- marque simplement absent pour qu'il sorte des statistiques de réception
-- (vendeurs venus, articles en attente/total) sans fausser le reste.
ALTER TABLE participations ADD COLUMN absent TINYINT(1) NOT NULL DEFAULT 0 AFTER statut;
