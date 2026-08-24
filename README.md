# Troc de la ludothèque

Application pour le troc annuel de la ludothèque : dépôt des listes de vente,
contrôle et étiquetage, caisse le jour de la vente, clôture (enveloppes et
invendus).

Stack : [Next.js](https://nextjs.org) (App Router, TypeScript, Tailwind) +
MariaDB (hébergée chez Infomaniak, accès direct via `mysql2`).

## État actuel

- [x] Schéma de base de données (`db/migrations/`), avec caisses, vidages de
      cash et règles bénévoles
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

1. Crée une base MariaDB dans le Manager Infomaniak (Hébergement web >
   Bases de données), note l'hôte, le port, l'utilisateur, le mot de passe
   et le nom de la base.
2. Applique le schéma :
   ```bash
   mariadb -h <hôte> -P <port> -u <utilisateur> -p <base> < db/migrations/0001_init.sql
   ```
3. Crée une édition ouverte pour pouvoir tester le dépôt de liste :
   ```sql
   INSERT INTO editions (id, annee, taux_achat, taux_vendeur)
   VALUES (UUID(), 2026, 0.10, 0.10);
   ```
4. Copie `.env.local.example` en `.env.local` et renseigne `DB_HOST`,
   `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
5. `npm run dev`, puis ouvre [http://localhost:3000](http://localhost:3000).

### Déploiement (Infomaniak, hébergement Node.js)

- Adresse du dépôt Git à utiliser : `https://github.com/johannvilliger/Ludonyon.git`
  (l'adresse de la page GitHub, avec `/tree/...`, ne fonctionne pas — il faut
  l'adresse "propre" du dépôt). La branche par défaut est `main`.
- Commande de build : `npm run build`
- Commande d'exécution : `npm start`
- Renseigne les variables d'environnement `DB_HOST`, `DB_PORT`, `DB_USER`,
  `DB_PASSWORD`, `DB_NAME` dans les réglages de l'application Node.js.

## Notes techniques

- Accès à la base exclusivement depuis le serveur (Server Components, Server
  Actions) via `src/lib/db.ts` — jamais depuis le navigateur, pas de clé ou
  de connexion exposée côté client.
- Les identifiants (UUID) et le code de confirmation sont générés côté
  application (`crypto.randomUUID`), pas par la base.
- Le numéro de vendeur est attribué par `assignerNumeroVendeur`
  (`src/lib/db.ts`) à l'aide d'un verrou nommé MariaDB (`GET_LOCK`), pour
  rester correct même en cas de soumissions simultanées.
- `vente_articles.article_id` est `UNIQUE` : un même article ne peut pas être
  vendu deux fois, même depuis deux caisses différentes — ça donne le
  blocage anti-double-scan directement au niveau de la base, pas seulement
  côté application.
- `editions.statut = 'ouverte'` est protégé par un index unique sur une
  colonne virtuelle (`ouverte_flag`), l'équivalent MariaDB d'un index unique
  partiel Postgres : une seule édition peut être "ouverte" à la fois.
- Les pages qui lisent des données changeantes (`/caisse`, `/dashboard`,
  etc.) sont explicitement marquées `export const dynamic = "force-dynamic"`
  pour ne jamais être pré-rendues au build.
- Règle bénévoles : le +10% (`taux_achat`) ne s'applique pas si l'acheteur est
  bénévole (`ventes.acheteur_benevole`) ; le −10% (`taux_vendeur`) ne
  s'applique pas si le vendeur est bénévole (`participations.est_benevole`).
  Une vente bénévole↔bénévole ne rapporte donc rien à la ludothèque, une vente
  mixte 10%, une vente client↔client 20%.
- `participations.est_benevole` n'est jamais renseigné par le formulaire
  public de dépôt — uniquement depuis l'écran d'accueil.
- Chaque caisse a un fonds de départ (`caisses.fond_initial`, 250.- par
  défaut) et les vidages sont tracés dans `mouvements_caisse` (montant,
  responsable, horodatage) pour calculer le cash présent en temps réel.
