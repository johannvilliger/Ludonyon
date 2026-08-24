# Troc de la ludothèque

Application pour le troc annuel de la ludothèque : dépôt des listes de vente,
contrôle et étiquetage, caisse le jour de la vente, clôture (enveloppes et
invendus).

Stack : [Next.js](https://nextjs.org) (App Router, TypeScript, Tailwind) +
MariaDB (hébergée chez Infomaniak, accès direct via `mysql2`).

## État actuel

- [x] Schéma de base de données (`db/migrations/`), avec caisses, vidages de
      cash, règles bénévoles et système d'accès `/gestion`
- [x] Dépôt de liste par le vendeur (`/vendeur/nouveau`) + page de confirmation
      avec QR — ouvert uniquement en phase "Dépôt en ligne"
- [x] Accueil/contrôle (`/accueil`, jamais lié publiquement) : recherche par
      nom, liste sur place (`/accueil/nouveau`, toujours ouvert), case
      "vendeur bénévole", impression des étiquettes (`vendeur-article-prix`),
      marquage "contrôlée"
- [x] `/gestion` : accès par code — 5 caisses (codes simples) + 1 dashboard
      (code complexe). Une caisse doit être validée manuellement depuis le
      dashboard pour se connecter ; codes modifiables depuis le dashboard.
- [x] Caisse (`/caisse/1` à `/caisse/5`, protégée par le code) : scan et
      panier, case "acheteur bénévole", blocage double scan et mismatch prix,
      encaissement, historique des ventes de la caisse
- [x] Dashboard (`/gestion/dashboard`) : création/pilotage des phases de
      l'édition, demandes de connexion caisse, ventes/cash par caisse en
      direct, bénéfice cumulé, vidage de caisse tracé, historique par caisse,
      gestion des codes d'accès
- [ ] Clôture (calcul des enveloppes à −10% sauf vendeur bénévole, suivi des
      invendus)
- [ ] Annulation d'une vente déjà encaissée (à définir)

## Mise en route

1. Crée une base MariaDB dans le Manager Infomaniak (Hébergement web >
   Bases de données), note l'hôte, le port, l'utilisateur, le mot de passe
   et le nom de la base.
2. Copie `.env.local.example` en `.env.local` (ou `.env`) et renseigne
   `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
3. Applique le schéma :
   ```bash
   npm run db:migrate
   ```
   (lit `db/migrations/*.sql` et les exécute sur la base configurée à
   l'étape 2 — pas besoin d'un client `mariadb` séparé, juste Node. Ça crée
   aussi les 5 postes de caisse avec des codes par défaut et le code
   dashboard par défaut, voir plus bas.)
4. `npm run dev`, puis ouvre [http://localhost:3000](http://localhost:3000).
5. Va sur `/gestion`, connecte-toi avec le code dashboard par défaut
   (`YNorfRMBtucZ5XMr` — **change-le tout de suite** dans la section "Codes
   d'accès" du dashboard une fois connecté), puis "Lancer une nouvelle
   édition" pour pouvoir tester le dépôt de liste et la caisse.

### Codes d'accès par défaut

Générés par la migration, à changer avant toute utilisation réelle (section
"Codes d'accès" du dashboard) :

| Poste     | Code par défaut    |
|-----------|---------------------|
| Caisse 1  | `1234`              |
| Caisse 2  | `2345`              |
| Caisse 3  | `3456`              |
| Caisse 4  | `4567`              |
| Caisse 5  | `5678`              |
| Dashboard | `YNorfRMBtucZ5XMr`  |

### Déploiement (Infomaniak, hébergement Node.js)

- Adresse du dépôt Git à utiliser : `https://github.com/johannvilliger/Ludonyon.git`
  (l'adresse de la page GitHub, avec `/tree/...`, ne fonctionne pas — il faut
  l'adresse "propre" du dépôt). La branche par défaut est `main`.
- Commande de build : `npm run build`
- Commande d'exécution : `npm start`
- Renseigne les variables d'environnement `DB_HOST`, `DB_PORT`, `DB_USER`,
  `DB_PASSWORD`, `DB_NAME` dans les réglages de l'application Node.js
  (jamais dans un fichier commité au dépôt).
- Une fois l'app importée et les variables d'environnement en place, lance
  `npm run db:migrate` une fois depuis la console SSH pour créer les tables.

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
- `editions.phase` (`depot` → `reception` → `caisse` → `post_vente`) est
  protégée par un index unique sur une colonne virtuelle (`active_flag`),
  l'équivalent MariaDB d'un index unique partiel Postgres : une seule
  édition peut être active (hors `post_vente`) à la fois. Seul le dashboard
  change la phase, dans n'importe quel sens.
- Le dépôt public (`/vendeur/nouveau`) n'accepte des listes qu'en phase
  `depot`. L'accueil (`/accueil`, `/accueil/nouveau`) n'est jamais bloqué
  par la phase — volontaire, pour absorber les couacs le jour de la caisse.
- `/gestion` : un seul champ code, qui route soit vers le dashboard (code
  dans `parametres_gestion`) soit vers une caisse (`postes_caisse`). Une
  caisse doit être validée manuellement depuis le dashboard
  (`demande_en_attente` → `connecte`) ; la page d'attente (`/gestion/attente/[numero]`)
  interroge le serveur toutes les 2 secondes. Sessions via cookies
  `httpOnly` (`gestion_dashboard`, `gestion_caisse`), un jeton par poste —
  le dashboard peut déconnecter une caisse à tout moment.
- Les pages qui lisent des données changeantes ou des cookies (`/caisse/*`,
  `/gestion/dashboard`, etc.) sont automatiquement rendues à la demande par
  Next.js (jamais pré-rendues au build).
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
- Objets refusés au troc (`src/lib/articles-interdits.ts`) : Peluche, DVD,
  CD, VHS — bloqués à la saisie (formulaire public et accueil) et à la
  soumission côté serveur, pas juste un avertissement.
