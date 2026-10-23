-- Messages laissés par les visiteurs via le widget "Une question ?" quand
-- leur question n'est pas couverte par la FAQ (voir
-- src/lib/messages-sans-reponse.ts). L'appel à Claude est pour l'instant
-- désactivé dans le widget (voir AssistantTroc.tsx) — à la place, on capture
-- la question et les coordonnées de la personne pour qu'un membre du comité
-- puisse répondre manuellement (voir /gestion/dashboard/messages).
CREATE TABLE IF NOT EXISTS messages_assistant (
  id CHAR(36) NOT NULL PRIMARY KEY,
  nom VARCHAR(255) NOT NULL,
  telephone VARCHAR(32) NOT NULL,
  email VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  traite TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX messages_assistant_created_at_idx (created_at)
) ENGINE = InnoDB;
