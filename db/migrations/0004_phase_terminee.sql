-- Bug : post_vente était traitée comme la fermeture de l'édition
-- (active_flag devenait NULL), ce qui rend le dashboard/accueil aveugles à
-- l'édition dès qu'on passe en post-vente — alors que c'est justement la
-- phase où on doit encore piloter les enveloppes/invendus depuis l'accueil
-- et le dashboard. On ajoute un 5ème état "terminee", séparé et
-- volontairement à part du sélecteur de phases (action dédiée et
-- irréversible), qui devient seul à désactiver l'édition.
ALTER TABLE editions
  DROP KEY editions_une_seule_active,
  DROP COLUMN active_flag;

ALTER TABLE editions
  CHANGE COLUMN phase phase ENUM('depot', 'reception', 'caisse', 'post_vente', 'terminee') NOT NULL DEFAULT 'depot';

ALTER TABLE editions
  ADD COLUMN active_flag TINYINT GENERATED ALWAYS AS (IF(phase <> 'terminee', 1, NULL)) VIRTUAL,
  ADD UNIQUE KEY editions_une_seule_active (active_flag);
