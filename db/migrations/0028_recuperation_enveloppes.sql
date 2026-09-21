-- Suivi de la remise physique des enveloppes (recette + invendus) aux
-- vendeurs, le samedi après la vente — voir /accueil/enveloppes.
-- enveloppe_signature : image (PNG en base64) de la signature tactile du
-- vendeur au moment de la remise, comme preuve de réception (pas de
-- montant demandé, juste la confirmation que l'enveloppe a bien changé de
-- main). MEDIUMTEXT largement suffisant pour un canvas de signature.
ALTER TABLE participations
  ADD COLUMN enveloppe_recuperee_le DATETIME NULL,
  ADD COLUMN enveloppe_signature MEDIUMTEXT NULL;
