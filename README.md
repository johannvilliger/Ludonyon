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
- [Prisma 7](https://www.prisma.io) + SQLite en développement
- [NextAuth (Auth.js) v5](https://authjs.dev) — connexion par identifiants
- [Tailwind CSS 4](https://tailwindcss.com)
- TypeScript

## Démarrage local

Prérequis : Node.js 20.9+.

```bash
npm install
cp .env.example .env
# générez une valeur pour AUTH_SECRET et collez-la dans .env :
openssl rand -base64 32

npx prisma migrate dev   # crée la base SQLite locale (dev.db)
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

## Déploiement

Le projet est prêt pour [Vercel](https://vercel.com) (gratuit pour ce
volume d'usage).

**Important** : SQLite (fichier local) ne convient qu'au développement.
Sur Vercel, le système de fichiers n'est pas persistant entre les
requêtes : il faut une base de données hébergée. Options gratuites
simples :

- [Vercel Postgres / Neon](https://vercel.com/marketplace/neon)
- [Supabase](https://supabase.com) (Postgres gratuit)

Étapes pour passer en production :

1. Créez une base Postgres gratuite chez l'un des fournisseurs ci-dessus
   et récupérez la chaîne de connexion.
2. Dans `prisma/schema.prisma`, changez `provider = "sqlite"` en
   `provider = "postgresql"`.
3. Dans `src/lib/prisma.ts` (et `prisma/seed.ts`), remplacez l'adaptateur
   `PrismaBetterSqlite3` par `PrismaPg` (package `@prisma/adapter-pg` +
   `pg`, voir la [doc Prisma Postgres](https://www.prisma.io/docs)).
4. Sur Vercel, définissez les variables d'environnement `DATABASE_URL`
   (chaîne Postgres) et `AUTH_SECRET` (générée avec `openssl rand -base64
   32`).
5. Déployez, puis exécutez `npx prisma migrate deploy` et
   `npm run db:seed` (ou créez le premier compte Comité directement en
   base) contre la base de production.

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
