-- Caisse de vente supplémentaire, demandée en cours d'édition. Numéro 7
-- (pas 6 : déjà pris par le poste remboursement, voir migration 0020, qui
-- route vers /remboursements et non /caisse/[numero]).
--
-- Code généré aléatoirement, comme les autres (voir 0002_gestion.sql) —
-- affiché par `npm run db:migrate` juste après cette migration.
INSERT INTO postes_caisse (id, numero, code_acces, type)
  VALUES (UUID(), 7, SUBSTRING(MD5(RAND()), 1, 6), 'vente');

-- Les caisses des éditions existantes sont normalement créées une seule
-- fois, à la création de l'édition (voir creerEdition) — l'édition déjà
-- active n'a donc pas encore de ligne `caisses` pour ce nouveau poste.
-- Ajoutée ici à la main pour que la caisse 7 fonctionne immédiatement, sans
-- attendre la prochaine édition.
INSERT INTO caisses (id, edition_id, nom, poste_caisse_id)
SELECT UUID(), e.id, 'Caisse 7', pc.id
FROM editions e, postes_caisse pc
WHERE e.active_flag = 1 AND pc.numero = 7;
