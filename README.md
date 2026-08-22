# Troc de la ludothèque

Application pour le troc annuel de la ludothèque : dépôt des listes de vente,
contrôle et étiquetage, caisse le jour de la vente, clôture (enveloppes et
invendus).

Stack : [Next.js](https://nextjs.org) (App Router, TypeScript, Tailwind) +
[Supabase](https://supabase.com) (Postgres, temps réel).

## État actuel

- [x] Schéma de base de données (`supabase/migrations/0001_init.sql`)
- [x] Dépôt de liste par le vendeur (`/vendeur/nouveau`) + page de confirmation
      avec QR
- [ ] Contrôle et impression des étiquettes (planche vendeur + QR
      `vendeur-article-prix`)
- [ ] Caisse (panier, +10%, blocage double scan / mismatch prix)
- [ ] Clôture (calcul des enveloppes, suivi des invendus)

## Mise en route

1. Crée un projet sur [supabase.com](https://supabase.com).
2. Dans l'éditeur SQL du projet, exécute le contenu de
   `supabase/migrations/0001_init.sql`.
3. Crée une édition ouverte pour pouvoir tester le dépôt de liste :
   ```sql
   insert into editions (annee, taux_commission) values (2026, 0.10);
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
