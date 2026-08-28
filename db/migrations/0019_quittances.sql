-- Quittance par email pour l'acheteur, sur demande à l'encaissement.
--
-- L'envoi n'est volontairement PAS immédiat : il est différé jusqu'à la
-- vente SUIVANTE sur la même caisse (ou jusqu'à la clôture de la caisse, si
-- aucune autre vente n'a lieu avant) — voir flusherQuittancesEnAttente dans
-- caisse/[numero]/actions.ts. Tant qu'une quittance est "en_attente", sa
-- vente reste "la dernière vente de la caisse" et peut donc encore être
-- annulée normalement (voir annulerDerniereVente) sans qu'aucun email n'ait
-- été envoyé entre-temps — impossible d'envoyer un ticket pour une vente qui
-- finit par être annulée.
CREATE TABLE IF NOT EXISTS quittances (
  id CHAR(36) NOT NULL PRIMARY KEY,
  vente_id CHAR(36) NOT NULL,
  caisse_id CHAR(36) NOT NULL,
  email VARCHAR(255) NOT NULL,
  statut ENUM('en_attente', 'envoyee', 'echec') NOT NULL DEFAULT 'en_attente',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  envoyee_le DATETIME NULL,
  -- Si la vente est annulée (annulerDerniereVente) pendant que la quittance
  -- est encore en_attente, elle disparaît avec elle — rien n'a été envoyé.
  FOREIGN KEY (vente_id) REFERENCES ventes(id) ON DELETE CASCADE,
  FOREIGN KEY (caisse_id) REFERENCES caisses(id) ON DELETE CASCADE
) ENGINE = InnoDB;
