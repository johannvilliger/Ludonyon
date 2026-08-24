-- Connexion en self-service pour les bénévoles : chacun se connecte avec
-- son numéro fixe + un mot de passe (défini par le staff, comme les codes
-- de caisse) pour voir et gérer sa propre liste d'articles sans passer par
-- le dashboard. mot_de_passe_hash vide = pas encore de mot de passe défini,
-- la connexion est alors refusée (voir src/lib/mot-de-passe.ts).
ALTER TABLE benevoles
  ADD COLUMN mot_de_passe_hash VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN session_token CHAR(36) NULL;
