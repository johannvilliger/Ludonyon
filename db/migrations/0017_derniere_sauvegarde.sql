-- Rappel de sauvegarde sur le dashboard : la sauvegarde reste un
-- téléchargement manuel (pas de sauvegarde automatique côté serveur), mais
-- on garde une trace de la dernière fois pour inciter à la refaire
-- régulièrement pendant la vente plutôt que de compter sur la mémoire.
ALTER TABLE parametres_gestion
  ADD COLUMN derniere_sauvegarde_le DATETIME NULL;
