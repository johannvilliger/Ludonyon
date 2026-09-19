-- Message affiché sur /vendeur/nouveau à la place du formulaire une fois le
-- dépôt terminé (phase de l'édition active <> 'depot') — jusqu'ici la page
-- ne vérifiait pas la phase et laissait le formulaire ouvert même en pleine
-- caisse. Texte libre modifiable depuis le dashboard (comme
-- date_ouverture_troc/date_recuperation_invendus) : dates et horaires
-- changent à chaque édition, jamais besoin de retoucher le code pour ça.
ALTER TABLE parametres_gestion
  ADD COLUMN message_depot_termine TEXT NULL;

UPDATE parametres_gestion
  SET message_depot_termine = 'Le dépôt est maintenant terminé ! Nous ouvrons la vente Samedi 21 novembre 2026 de 9h à 13h !\nEt venez récupérer vos invendus à 18h !'
  WHERE id = 1 AND message_depot_termine IS NULL;
