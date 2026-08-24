-- Base fixe des vendeurs bénévoles : numéro attribué une fois, gardé
-- d'édition en édition (contrairement aux vendeurs clients 1-899, dont le
-- numéro est réattribué à chaque édition par assignerNumeroVendeur).
-- Inclut aussi les deux numéros spéciaux 901 (Ludothèque) et
-- 902 (Dons Ludothèque), qui suivent le même mécanisme de participation
-- automatique à chaque nouvelle édition mais ne sont jamais de vrais
-- bénévoles (voir src/lib/vendeurs-speciaux.ts) : rien ne leur est jamais
-- dû, et un achat par un bénévole sur ces deux numéros est gratuit.
CREATE TABLE IF NOT EXISTS benevoles (
  id CHAR(36) NOT NULL PRIMARY KEY,
  vendeur_id CHAR(36) NOT NULL,
  numero_fixe INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY benevoles_numero_uk (numero_fixe),
  UNIQUE KEY benevoles_vendeur_uk (vendeur_id),
  FOREIGN KEY (vendeur_id) REFERENCES vendeurs(id) ON DELETE CASCADE
) ENGINE = InnoDB;

SET @vendeur_ludo = UUID();
SET @vendeur_dons = UUID();

INSERT INTO vendeurs (id, nom) VALUES (@vendeur_ludo, 'Ludothèque'), (@vendeur_dons, 'Dons Ludothèque');

INSERT INTO benevoles (id, vendeur_id, numero_fixe) VALUES
  (UUID(), @vendeur_ludo, 901),
  (UUID(), @vendeur_dons, 902);
