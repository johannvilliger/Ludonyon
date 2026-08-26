-- Date/heure d'ouverture affichée en compte à rebours sur l'écran de
-- verrouillage (voir src/app/verrouille/page.tsx). Libre, sans lien avec le
-- statut de l'édition : NULL = pas de compteur affiché.
ALTER TABLE parametres_gestion
  ADD COLUMN date_ouverture_troc DATETIME NULL;
