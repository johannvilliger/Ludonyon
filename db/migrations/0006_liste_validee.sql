-- Nouvel état "validee" : la liste passe par contrôlée (visuel du contenu à
-- l'accueil) puis validée (une fois tous les articles reçus, bouton
-- "Terminer" sur la fiche vendeur), avant la clôture de fin d'édition.
ALTER TABLE participations
  MODIFY COLUMN statut ENUM('liste_soumise', 'controlee', 'validee', 'cloturee') NOT NULL DEFAULT 'liste_soumise';
