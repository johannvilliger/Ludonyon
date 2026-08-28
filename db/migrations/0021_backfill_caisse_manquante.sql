-- Le poste de remboursement (migration 0020) a été ajouté alors qu'une
-- édition était déjà active (créée via creerEdition() avant cette
-- migration) : elle n'a donc jamais reçu sa ligne caisses pour ce poste,
-- contrairement aux 5 caisses de vente qui existaient déjà au moment de sa
-- création. Résultat : "Pas encore de caisse pour cette édition" au
-- dashboard et "Aucune édition active" sur /remboursements pour cette
-- édition-là.
--
-- Rattrape toute combinaison édition active / poste sans caisse
-- correspondante — couvre ce cas précis, et se comporte correctement (no-op)
-- si un futur ajout de poste tombe dans le même piège.
INSERT INTO caisses (id, edition_id, nom, poste_caisse_id)
SELECT UUID(), e.id, CONCAT('Caisse ', pc.numero), pc.id
FROM editions e
CROSS JOIN postes_caisse pc
WHERE e.active_flag = 1
  AND NOT EXISTS (
    SELECT 1 FROM caisses c WHERE c.edition_id = e.id AND c.poste_caisse_id = pc.id
  );
