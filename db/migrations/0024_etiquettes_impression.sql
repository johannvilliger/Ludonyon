-- File d'attente pour l'imprimante à étiquettes centralisée (Brother
-- QL-820NWB) : une caisse y dépose un ticket (case "Ticket papier" à
-- l'encaissement, voir caisse/[numero]/actions.ts), et un petit programme
-- Windows externe à ce dépôt (print-agent/, jamais déployé avec le site)
-- l'interroge régulièrement via /api/etiquettes et imprime.
--
-- contenu_json fige le contenu au moment de l'encaissement (numéro de
-- caisse, articles, taux, total) plutôt que de le recalculer via des
-- jointures au moment de l'impression : le ticket reste imprimable tel
-- quel même si la vente d'origine est ensuite annulée ou remboursée.
CREATE TABLE IF NOT EXISTS etiquettes_impression (
  id CHAR(36) NOT NULL PRIMARY KEY,
  numero_caisse INT NOT NULL,
  contenu_json TEXT NOT NULL,
  statut ENUM('en_attente', 'imprimee', 'echec') NOT NULL DEFAULT 'en_attente',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  imprimee_le DATETIME NULL
) ENGINE = InnoDB;

-- Secret partagé avec print-agent (pas un code humain comme les autres
-- codes d'accès : jamais saisi dans un formulaire, seulement copié une
-- fois dans la config du programme Windows). Généré tout de suite (comme
-- le code_acces du poste remboursement en migration 0020) pour que le
-- champ ne soit jamais vide au dashboard — régénérable depuis là si besoin.
ALTER TABLE parametres_gestion
  ADD COLUMN code_impression VARCHAR(64) NULL;

UPDATE parametres_gestion
  SET code_impression = SUBSTRING(MD5(RAND()), 1, 32)
  WHERE id = 1 AND code_impression IS NULL;
