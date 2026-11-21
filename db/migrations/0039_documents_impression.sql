-- File d'attente générique pour imprimer un PDF déjà entièrement généré
-- côté serveur — contrairement aux tickets et aux étiquettes articles
-- (migrations 0024, 0033), print-agent ne reconstruit rien ici : il décode
-- pdf_base64 et l'envoie tel quel à l'imprimante (voir print.js). Pensé pour
-- des documents rares, déjà corrects tels quels et coûteux à reproduire
-- fidèlement en PDFKit côté print-agent : étiquettes de clôture (planche
-- Herma, multi-pages) et PDF détaillé de clôture (une page par vendeur).
--
-- ordre en AUTO_INCREMENT dès le départ (pas created_at) — voir migration
-- 0038 : created_at (résolution seconde) ne départage pas des documents
-- insérés dans la même seconde.
CREATE TABLE IF NOT EXISTS documents_impression (
  id CHAR(36) NOT NULL PRIMARY KEY,
  ordre INT NOT NULL AUTO_INCREMENT UNIQUE,
  nom_fichier VARCHAR(255) NOT NULL,
  pdf_base64 MEDIUMTEXT NOT NULL,
  statut ENUM('en_attente', 'imprimee', 'echec') NOT NULL DEFAULT 'en_attente',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  imprimee_le DATETIME NULL
) ENGINE = InnoDB;
