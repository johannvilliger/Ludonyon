-- Case à cocher ajoutée à l'écran de remise d'enveloppe
-- (/accueil/enveloppes/[code]) : "tenez-moi informé·e du troc l'an
-- prochain ?". Stocké sur vendeurs (pas participations) car c'est une
-- préférence de la personne, pas liée à une édition précise — sert
-- ensuite à construire une liste de distribution (export manuel, le lien
-- avec LudoApp se fera plus tard séparément).
--
-- Par défaut à 1 (coché) : les vendeurs déjà existants avant cette
-- migration sont donc traités comme partants, cohérent avec la valeur par
-- défaut de la case à cocher elle-même.
ALTER TABLE vendeurs
  ADD COLUMN souhaite_etre_informe TINYINT(1) NOT NULL DEFAULT 1;
