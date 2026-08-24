-- Montant réel compté par le caissier à la clôture (hors fond de caisse de
-- 250.-), pour comparaison avec le théorique (ventes - vidages) côté
-- dashboard sans jamais influencer le calcul du bénéfice (basé uniquement
-- sur les ventes réelles enregistrées).
ALTER TABLE caisses
  ADD COLUMN montant_cloture INT NULL;
