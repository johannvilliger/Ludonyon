-- Historique persistant des blocages IP (voir src/lib/rate-limit.ts) : le
-- mécanisme de blocage lui-même reste en mémoire (une Map JS, volontairement
-- non partagée entre process), mais chaque déclenchement d'un blocage est
-- désormais aussi enregistré ici pour rester consultable après un
-- redémarrage — consulté sur /secu (page sans lien menu).
CREATE TABLE IF NOT EXISTS blocages_ip (
  id CHAR(36) NOT NULL PRIMARY KEY,
  ip VARCHAR(64) NOT NULL,
  formulaire VARCHAR(255) NOT NULL,
  bloque_le DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB;
