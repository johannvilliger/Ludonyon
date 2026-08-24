# Troc de la ludothèque

Application pour le troc annuel de la ludothèque : dépôt des listes de vente,
contrôle et étiquetage, caisse le jour de la vente, clôture (enveloppes et
invendus).

Stack : [Next.js](https://nextjs.org) (App Router, TypeScript, Tailwind) +
[Supabase](https://supabase.com) (Postgres, temps réel).

## État actuel

- [x] Schéma de base de données (`supabase/migrations/`), avec caisses,
      vidages de cash et règles bénévoles
- [x] Dépôt de liste par le vendeur (`/vendeur/nouveau`) + page de confirmation
      avec QR
- [x] Accueil/contrôle (`/accueil`) : recherche par nom, liste sur place
      (`/accueil/nouveau`), case "vendeur bénévole", impression des étiquettes
      (`vendeur-article-prix`), marquage "contrôlée"
- [x] Caisse (`/caisse`) : sélection/ouverture d'une caisse, scan et panier,
      case "acheteur bénévole", blocage double scan et mismatch prix,
      encaissement
- [x] Dashboard (`/dashboard`) : ventes par caisse, cash en caisse en direct,
      bénéfice cumulé, vidage de caisse tracé
- [ ] Clôture (calcul des enveloppes à −10% sauf vendeur bénévole, suivi des
      invendus)

## Mise en route

1. Crée un projet sur [supabase.com](https://supabase.com).
2. Dans l'éditeur SQL du projet, exécute le contenu de
   `supabase/migrations/0001_init.sql`.
3. Crée une édition ouverte pour pouvoir tester le dépôt de liste :
   ```sql
   insert into editions (annee, taux_achat, taux_vendeur) values (2026, 0.10, 0.10);
   ```
4. Copie `.env.local.example` en `.env.local` et renseigne `SUPABASE_URL` et
   `SUPABASE_SERVICE_ROLE_KEY` (Project Settings > API).
5. `npm run dev`, puis ouvre [http://localhost:3000](http://localhost:3000).

## Notes techniques

- Toutes les tables ont RLS activé sans policy : les accès passent
  exclusivement par le serveur Next.js (clé `service_role`), jamais depuis le
  navigateur. À revoir quand la caisse aura besoin d'un flux temps réel côté
  client (clé `anon` + policies dédiées).
- Le numéro de vendeur est attribué automatiquement par la base
  (`assign_numero_vendeur`), séquentiel par édition.
- `vente_articles.article_id` est `unique` : un même article ne peut pas être
  vendu deux fois, même depuis deux caisses différentes — ça donne le blocage
  anti-double-scan directement au niveau de la base.
- Règle bénévoles : le +10% (`taux_achat`) ne s'applique pas si l'acheteur est
  bénévole (`ventes.acheteur_benevole`) ; le −10% (`taux_vendeur`) ne
  s'applique pas si le vendeur est bénévole (`participations.est_benevole`).
  Une vente bénévole↔bénévole ne rapporte donc rien à la ludothèque, une vente
  mixte 10%, une vente client↔client 20%.
- `participations.est_benevole` n'est jamais renseigné par le formulaire
  public de dépôt — uniquement depuis un écran réservé à l'accueil/comité (pas
  encore construit).
- Chaque caisse a un fonds de départ (`caisses.fond_initial`, 250.- par
  défaut) et les vidages sont tracés dans `mouvements_caisse` (montant,
  responsable, horodatage) pour calculer le cash présent en temps réel.
