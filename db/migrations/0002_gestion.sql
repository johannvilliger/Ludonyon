-- Système d'accès /gestion : 5 postes de caisse fixes + dashboard, codes
-- d'accès modifiables, et phases du troc pilotées par le dashboard.

-- editions.statut devient editions.phase, avec 4 étapes plutôt que
-- ouverte/clôturée. Une seule édition peut être active (phase != post_vente)
-- à la fois — même mécanisme d'index unique sur colonne virtuelle qu'avant.
ALTER TABLE editions
  DROP KEY editions_une_seule_ouverte,
  DROP COLUMN ouverte_flag;

ALTER TABLE editions
  CHANGE COLUMN statut phase ENUM('depot', 'reception', 'caisse', 'post_vente') NOT NULL DEFAULT 'depot';

ALTER TABLE editions
  ADD COLUMN active_flag TINYINT GENERATED ALWAYS AS (IF(phase <> 'post_vente', 1, NULL)) VIRTUAL,
  ADD UNIQUE KEY editions_une_seule_active (active_flag);

-- 5 postes de caisse fixes et persistants (indépendants de l'édition) :
-- chacun a un code d'accès simple, modifiable depuis le dashboard.
-- connecte/session_token/demande_en_attente gèrent la connexion en deux
-- temps (code caisse -> validation manuelle depuis le dashboard).
CREATE TABLE postes_caisse (
  id CHAR(36) NOT NULL PRIMARY KEY,
  numero INT NOT NULL,
  code_acces VARCHAR(20) NOT NULL,
  connecte TINYINT(1) NOT NULL DEFAULT 0,
  session_token CHAR(36) NULL,
  demande_en_attente TINYINT(1) NOT NULL DEFAULT 0,
  UNIQUE KEY postes_caisse_numero_uk (numero)
) ENGINE = InnoDB;

-- Codes générés aléatoirement (jamais de valeur fixe en dur dans le code
-- source) : `npm run db:migrate` les affiche dans le terminal juste après
-- les avoir créés, à noter sur le moment — c'est la seule fois où ils
-- apparaissent en clair hors de la base. Changeables ensuite depuis le
-- dashboard, section "Codes d'accès".
INSERT INTO postes_caisse (id, numero, code_acces) VALUES
  (UUID(), 1, SUBSTRING(MD5(RAND()), 1, 6)),
  (UUID(), 2, SUBSTRING(MD5(RAND()), 1, 6)),
  (UUID(), 3, SUBSTRING(MD5(RAND()), 1, 6)),
  (UUID(), 4, SUBSTRING(MD5(RAND()), 1, 6)),
  (UUID(), 5, SUBSTRING(MD5(RAND()), 1, 6));

-- Accès dashboard : une seule ligne, code volontairement plus complexe et
-- généré aléatoirement (voir commentaire ci-dessus).
CREATE TABLE parametres_gestion (
  id TINYINT NOT NULL PRIMARY KEY DEFAULT 1,
  code_dashboard VARCHAR(50) NOT NULL,
  session_token CHAR(36) NULL,
  CONSTRAINT parametres_gestion_singleton CHECK (id = 1)
) ENGINE = InnoDB;

INSERT INTO parametres_gestion (id, code_dashboard) VALUES (1, SUBSTRING(MD5(RAND()), 1, 20));

-- Chaque caisse d'une édition est rattachée à l'un des 5 postes fixes.
ALTER TABLE caisses
  ADD COLUMN poste_caisse_id CHAR(36) NULL,
  ADD FOREIGN KEY (poste_caisse_id) REFERENCES postes_caisse(id);
