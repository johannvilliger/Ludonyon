-- Compteur de visiteurs uniques de la page d'accueil publique (voir
-- src/app/page.tsx et src/lib/visites.ts) : pas de vendeur qui s'inscrit,
-- au moins savoir si des gens viennent regarder.
--
-- visiteur_hash fige une empreinte non réversible (IP + user-agent + jour
-- + sel serveur secret) plutôt qu'un cookie ou l'IP en clair : aucun suivi
-- possible d'un jour à l'autre, juste un comptage de visiteurs distincts
-- par jour (COUNT(DISTINCT visiteur_hash) GROUP BY DATE(created_at)) — pas
-- de bandeau de consentement nécessaire, rien de personnel n'est conservé.
CREATE TABLE IF NOT EXISTS visites (
  id CHAR(36) NOT NULL PRIMARY KEY,
  visiteur_hash CHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX visites_created_at_idx (created_at)
) ENGINE = InnoDB;

-- Sel secret pour le hash ci-dessus (même mécanisme que code_impression en
-- migration 0024) : sans lui, une IP courante serait devinable par table
-- arc-en-ciel à partir du hash stocké.
ALTER TABLE parametres_gestion
  ADD COLUMN visites_sel VARCHAR(64) NULL;

UPDATE parametres_gestion
  SET visites_sel = SUBSTRING(MD5(RAND()), 1, 32)
  WHERE id = 1 AND visites_sel IS NULL;
