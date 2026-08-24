-- Les bénévoles/901/902 sont désormais rattachés automatiquement à chaque
-- édition dès sa création (voir creerEdition), mais une édition déjà en
-- cours au moment où ce système est arrivé n'a jamais reçu ces
-- participations. On les rattrape ici pour l'édition active, si elle
-- existe — sans rien faire pour les éditions déjà terminées.
INSERT INTO participations (id, edition_id, vendeur_id, numero_vendeur, code_confirmation, est_benevole)
SELECT
  UUID(),
  e.id,
  b.vendeur_id,
  b.numero_fixe,
  LOWER(HEX(RANDOM_BYTES(6))),
  IF(b.numero_fixe IN (901, 902), 0, 1)
FROM editions e
CROSS JOIN benevoles b
WHERE e.active_flag = 1
  AND NOT EXISTS (
    SELECT 1 FROM participations p WHERE p.edition_id = e.id AND p.vendeur_id = b.vendeur_id
  );
