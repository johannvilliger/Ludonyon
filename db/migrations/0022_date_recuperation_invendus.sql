-- Date/heure à laquelle les vendeurs peuvent venir récupérer leurs invendus
-- après le troc — rappelée dans l'email envoyé quand l'accueil marque une
-- liste comme contrôlée (voir marquerControlee). Même mécanisme que
-- date_ouverture_troc (migration 0015) : un seul réglage pour l'édition en
-- cours, modifiable depuis le dashboard, NULL = pas encore fixée.
ALTER TABLE parametres_gestion
  ADD COLUMN date_recuperation_invendus DATETIME NULL;
