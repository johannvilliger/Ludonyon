-- Schéma du troc de la ludothèque (MariaDB / MySQL).
-- Toutes les clés primaires sont des UUID générés côté application
-- (crypto.randomUUID()), pas par la base.

SET NAMES utf8mb4;

CREATE TABLE editions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  annee INT NOT NULL,
  date_depot DATE NULL,
  date_vente DATE NULL,
  taux_achat DECIMAL(4,3) NOT NULL DEFAULT 0.100,
  taux_vendeur DECIMAL(4,3) NOT NULL DEFAULT 0.100,
  association_beneficiaire VARCHAR(255) NULL,
  statut ENUM('ouverte', 'cloturee') NOT NULL DEFAULT 'ouverte',
  -- Colonne virtuelle + index unique : reproduit l'équivalent d'un index
  -- unique partiel Postgres pour garantir qu'une seule édition est
  -- "ouverte" à la fois (les NULL ne sont pas comparés entre eux par
  -- l'index unique, donc les éditions clôturées ne se gênent pas).
  ouverte_flag TINYINT GENERATED ALWAYS AS (IF(statut = 'ouverte', 1, NULL)) VIRTUAL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY editions_annee_uk (annee),
  UNIQUE KEY editions_une_seule_ouverte (ouverte_flag)
) ENGINE = InnoDB;

CREATE TABLE vendeurs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  nom VARCHAR(255) NOT NULL,
  telephone VARCHAR(50) NULL,
  email VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB;

CREATE TABLE categories (
  id CHAR(36) NOT NULL PRIMARY KEY,
  edition_id CHAR(36) NOT NULL,
  nom VARCHAR(255) NOT NULL,
  ordre INT NOT NULL DEFAULT 0,
  FOREIGN KEY (edition_id) REFERENCES editions(id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- Le numéro de vendeur est attribué par l'application (voir src/lib/db.ts,
-- assignerNumeroVendeur) à l'aide d'un verrou nommé MariaDB (GET_LOCK),
-- l'équivalent applicatif de pg_advisory_xact_lock côté Postgres.
CREATE TABLE participations (
  id CHAR(36) NOT NULL PRIMARY KEY,
  edition_id CHAR(36) NOT NULL,
  vendeur_id CHAR(36) NOT NULL,
  numero_vendeur INT NULL,
  code_confirmation VARCHAR(20) NOT NULL,
  statut ENUM('liste_soumise', 'controlee', 'cloturee') NOT NULL DEFAULT 'liste_soumise',
  -- Jamais renseigné par le formulaire public : uniquement depuis l'accueil.
  est_benevole TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY participations_code_uk (code_confirmation),
  UNIQUE KEY participations_edition_numero_uk (edition_id, numero_vendeur),
  FOREIGN KEY (edition_id) REFERENCES editions(id) ON DELETE CASCADE,
  FOREIGN KEY (vendeur_id) REFERENCES vendeurs(id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE articles (
  id CHAR(36) NOT NULL PRIMARY KEY,
  participation_id CHAR(36) NOT NULL,
  numero_article INT NOT NULL,
  nom VARCHAR(255) NOT NULL,
  prix INT NOT NULL CHECK (prix >= 0),
  categorie_id CHAR(36) NULL,
  statut ENUM('soumis', 'etiquete', 'controle', 'en_vente', 'vendu', 'invendu_recupere', 'invendu_donne')
    NOT NULL DEFAULT 'soumis',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY articles_participation_numero_uk (participation_id, numero_article),
  FOREIGN KEY (participation_id) REFERENCES participations(id) ON DELETE CASCADE,
  FOREIGN KEY (categorie_id) REFERENCES categories(id)
) ENGINE = InnoDB;

CREATE TABLE caisses (
  id CHAR(36) NOT NULL PRIMARY KEY,
  edition_id CHAR(36) NOT NULL,
  nom VARCHAR(255) NOT NULL,
  fond_initial INT NOT NULL DEFAULT 250,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (edition_id) REFERENCES editions(id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE ventes (
  id CHAR(36) NOT NULL PRIMARY KEY,
  edition_id CHAR(36) NOT NULL,
  caisse_id CHAR(36) NOT NULL,
  acheteur_benevole TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (edition_id) REFERENCES editions(id) ON DELETE CASCADE,
  FOREIGN KEY (caisse_id) REFERENCES caisses(id)
) ENGINE = InnoDB;

-- UNIQUE sur article_id : un même article ne peut pas être vendu deux fois,
-- même depuis deux caisses différentes — blocage anti-double-scan au
-- niveau de la base, pas seulement côté application.
CREATE TABLE vente_articles (
  id CHAR(36) NOT NULL PRIMARY KEY,
  vente_id CHAR(36) NOT NULL,
  article_id CHAR(36) NOT NULL,
  prix_encaisse INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY vente_articles_article_uk (article_id),
  FOREIGN KEY (vente_id) REFERENCES ventes(id) ON DELETE CASCADE,
  FOREIGN KEY (article_id) REFERENCES articles(id)
) ENGINE = InnoDB;

CREATE TABLE mouvements_caisse (
  id CHAR(36) NOT NULL PRIMARY KEY,
  caisse_id CHAR(36) NOT NULL,
  montant INT NOT NULL CHECK (montant > 0),
  effectue_par VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (caisse_id) REFERENCES caisses(id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE clotures (
  id CHAR(36) NOT NULL PRIMARY KEY,
  participation_id CHAR(36) NOT NULL,
  montant_calcule INT NOT NULL,
  montant_remis INT NULL,
  invendus_recuperes TINYINT(1) NOT NULL DEFAULT 0,
  invendus_donnes TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY clotures_participation_uk (participation_id),
  FOREIGN KEY (participation_id) REFERENCES participations(id)
) ENGINE = InnoDB;
