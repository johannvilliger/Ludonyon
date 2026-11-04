-- File d'attente pour l'impression centralisée des étiquettes articles
-- (planche Herma 4357, voir globals.css) depuis l'accueil — même mécanisme
-- que etiquettes_impression (migration 0024) pour les tickets de caisse :
-- print-agent interroge /api/etiquettes-articles/en-attente et imprime sur
-- l'imprimante A4 de l'accueil, avec le même secret partagé
-- (parametres_gestion.code_impression) que pour les tickets.
--
-- contenu_json fige la feuille telle que composée au moment de l'envoi
-- (coordonnées vendeur + liste des cases, dans l'ordre d'impression —
-- copies "plusieurs" et étiquettes "texte seul" déjà développées) : la
-- feuille reste imprimable telle quelle même si la liste est ensuite
-- modifiée.
CREATE TABLE IF NOT EXISTS etiquettes_articles_impression (
  id CHAR(36) NOT NULL PRIMARY KEY,
  participation_id CHAR(36) NOT NULL,
  numero_vendeur INT NOT NULL,
  contenu_json TEXT NOT NULL,
  statut ENUM('en_attente', 'imprimee', 'echec') NOT NULL DEFAULT 'en_attente',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  imprimee_le DATETIME NULL
) ENGINE = InnoDB;
