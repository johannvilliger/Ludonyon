# Ludonyon — Espace des bénévoles

Application communautaire pour les bénévoles, responsables et membres du
comité de la Ludothèque Nyon Région : annuaire, annonces, gestion
d'événements avec inscription, et un espace privé pour organiser les
activités.

## Fonctionnalités

- **Connexion** par email / mot de passe (comptes créés par un·e
  responsable ou un membre du comité, pas d'auto-inscription).
- **Annuaire des bénévoles** : nom, contact, compétences/disponibilités.
- **Annonces** : fil de nouvelles de l'équipe.
- **Événements** : liste des permanences/animations à venir, avec
  inscription et désinscription en un clic.
- **Espace organisation** (réservé aux rôles Responsable et Comité) :
  créer des annonces et des événements, voir qui s'est inscrit, gérer les
  comptes bénévoles (créer, changer de rôle, réinitialiser un mot de
  passe, supprimer).

### Rôles

| Rôle | Accès |
| --- | --- |
| Bénévole | Annuaire, annonces, événements (inscription) |
| Responsable | Idem + Espace organisation |
| Comité | Idem + Espace organisation |

Une prochaine étape possible (non implémentée pour l'instant) : un espace
privé supplémentaire réservé au comité pour des listes de tâches internes.
Le modèle de rôles est déjà en place pour l'ajouter facilement plus tard.

## Stack technique

- [Next.js 16](https://nextjs.org) (App Router, Turbopack)
- [Prisma 7](https://www.prisma.io) + MySQL
- [NextAuth (Auth.js) v5](https://authjs.dev) — connexion par identifiants
- [Tailwind CSS 4](https://tailwindcss.com)
- TypeScript

## Démarrage local

Prérequis : Node.js 20.9+ et un serveur MySQL/MariaDB accessible (local ou distant).

```bash
npm install
cp .env.example .env
# renseignez DATABASE_URL (voir format dans .env.example) et générez
# une valeur pour AUTH_SECRET :
openssl rand -base64 32

npx prisma migrate dev   # crée les tables dans la base MySQL
npm run db:seed          # comptes de démonstration (voir ci-dessous)
npm run dev
```

L'application est alors disponible sur http://localhost:3000.

### Comptes de démonstration (créés par `npm run db:seed`)

| Email | Mot de passe | Rôle |
| --- | --- | --- |
| comite@ludonyon.ch | ludonyon2024 | Comité |
| responsable@ludonyon.ch | ludonyon2024 | Responsable |
| alex.martin@example.ch | benevole2024 | Bénévole |
| chris.rochat@example.ch | benevole2024 | Bénévole |

⚠️ Changez ou supprimez ces comptes avant toute mise en production.

### Ajouter les vrais comptes des bénévoles

Une fois connecté·e avec un compte Responsable ou Comité, allez dans
**Espace organisation → Bénévoles** pour créer un compte par bénévole
(un mot de passe provisoire à leur communiquer ; ils peuvent le changer
ensuite depuis **Mon profil**).

## Déploiement (Infomaniak, hébergement Node.js + MySQL)

1. Dans le Manager Infomaniak, créez un site **Node.js** (Hébergement →
   votre site → Ajouter un site) et choisissez **« Importer un projet
   existant »** pour cloner ce dépôt Git (branche de production).
2. Configurez le site :
   - **Commande de build** : `npm install && npm run build`
   - **Commande de démarrage** : `npm run start`
   - **Dossier d'exécution** : la racine du dépôt (là où se trouve
     `package.json`)
   - Le port est géré automatiquement par Infomaniak via la variable
     `PORT`, que `next start` lit tout seul.
3. Dans les **variables d'environnement** du site, ajoutez :
   - `DATABASE_URL` — chaîne de connexion à votre base MySQL Infomaniak,
     au format `mysql://UTILISATEUR:MOTDEPASSE@HOTE:PORT/NOM_BASE`
   - `AUTH_SECRET` — générée avec `openssl rand -base64 32`
   - `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_SUBJECT` —
     pour les notifications push. Générez une paire de clés dédiée à la
     production avec `npx web-push generate-vapid-keys` (ne réutilisez
     pas celle du développement local). `VAPID_SUBJECT` est un
     `mailto:` de contact, ex. `mailto:contact@ludonyonregion.ch`.
4. Depuis le terminal SSH du site (bouton dans le Manager), lancez :
   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```
   Ça crée les tables et les comptes de démonstration (à changer/
   supprimer ensuite, voir ci-dessous).
5. Redémarrez le site depuis le Manager si nécessaire.

### Photos de profil

Les photos uploadées par les bénévoles sont stockées comme fichiers dans
`public/uploads/photos/` sur le serveur (pas dans la base de données, pas
dans le dépôt Git — ce dossier est volontairement ignoré par git). Elles
survivent aux `git pull` et rebuilds normaux. Seule l'action **« Réinitialiser
le site »** dans le Manager Infomaniak les effacerait (avec le reste du
site) : à éviter une fois en production.

### PWA et notifications push

Le site est installable (icône sur l'écran d'accueil, mobile et
ordinateur) et peut envoyer des notifications push aux bénévoles ayant
activé l'option depuis **Mon profil**. Ça ne nécessite aucune app store.

Trois usages :
- Rappel automatique ~1h avant un événement pour les personnes ayant coché
  "je veux être notifié·e" à l'inscription.
- Envoi manuel depuis **Espace organisation → Notifications** (à tous les
  bénévoles ou juste responsables/comité).
- Le rappel "ouvertures" (case globale dans Mon profil) est prévu pour la
  future page de planning, pas encore branché à un envoi réel.

⚠️ **À tester obligatoirement sur un vrai téléphone une fois déployé** —
l'activation des notifications (autorisation du navigateur, réception
réelle) ne peut pas être vérifiée autrement. Sur iPhone, le site doit
d'abord être ajouté à l'écran d'accueil (limite d'Apple, pas du site).

### Mises à jour

- **Avec accès SSH** (inclus sur la plupart des offres Infomaniak) : sur
  le serveur, `git pull` puis relancez la commande de build et
  redémarrez le site.
- **Sans SSH** : reconstruisez le projet localement et transférez les
  fichiers par SFTP, puis redémarrez le site manuellement depuis le
  Manager.

## Structure du projet

```
prisma/schema.prisma        Modèle de données (User, Announcement, Event, EventSignup)
prisma/seed.ts               Script de données de démonstration
src/auth.ts                  Configuration NextAuth (rôles, session)
src/proxy.ts                 Protection des routes (connexion + accès Espace organisation)
src/lib/actions/             Server Actions (mutations : événements, annonces, bénévoles, profil)
src/app/(auth)/connexion/    Page de connexion
src/app/(main)/              Pages authentifiées (accueil, annuaire, annonces, événements, profil)
src/app/(main)/organisation/ Espace privé Responsables/Comité
```
