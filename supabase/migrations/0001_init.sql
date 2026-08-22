-- Schéma initial : troc de la ludothèque
-- Une édition = une occurrence annuelle du troc (dépôt + vente).

create extension if not exists pgcrypto;

create table editions (
  id uuid primary key default gen_random_uuid(),
  annee integer not null unique,
  date_depot date,
  date_vente date,
  taux_commission numeric(4,3) not null default 0.10,
  association_beneficiaire text,
  statut text not null default 'ouverte' check (statut in ('ouverte', 'cloturee')),
  created_at timestamptz not null default now()
);

-- Une seule édition "ouverte" à la fois : c'est celle qui accepte les nouvelles listes.
create unique index editions_une_seule_ouverte
  on editions (statut)
  where statut = 'ouverte';

create table vendeurs (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  telephone text,
  email text,
  created_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references editions(id) on delete cascade,
  nom text not null,
  ordre integer not null default 0
);

create table participations (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references editions(id) on delete cascade,
  vendeur_id uuid not null references vendeurs(id) on delete cascade,
  numero_vendeur integer,
  code_confirmation text not null unique default encode(gen_random_bytes(6), 'hex'),
  statut text not null default 'liste_soumise' check (statut in ('liste_soumise', 'controlee', 'cloturee')),
  created_at timestamptz not null default now(),
  unique (edition_id, numero_vendeur)
);

-- Attribue le numéro de vendeur suivant pour l'édition, de façon sûre en cas de
-- soumissions concurrentes (verrou le temps de la transaction, par édition).
create or replace function assign_numero_vendeur()
returns trigger as $$
begin
  if new.numero_vendeur is null then
    perform pg_advisory_xact_lock(hashtext(new.edition_id::text));
    select coalesce(max(numero_vendeur), 0) + 1 into new.numero_vendeur
    from participations
    where edition_id = new.edition_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_assign_numero_vendeur
before insert on participations
for each row execute function assign_numero_vendeur();

create table articles (
  id uuid primary key default gen_random_uuid(),
  participation_id uuid not null references participations(id) on delete cascade,
  numero_article integer not null,
  nom text not null,
  prix integer not null check (prix >= 0),
  categorie_id uuid references categories(id),
  statut text not null default 'soumis'
    check (statut in ('soumis', 'etiquete', 'controle', 'en_vente', 'vendu', 'invendu_recupere', 'invendu_donne')),
  created_at timestamptz not null default now(),
  unique (participation_id, numero_article)
);

create table ventes (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references editions(id) on delete cascade,
  caisse_id text,
  created_at timestamptz not null default now()
);

create table vente_articles (
  id uuid primary key default gen_random_uuid(),
  vente_id uuid not null references ventes(id) on delete cascade,
  -- unique(article_id) empêche nativement qu'un même article soit vendu deux fois,
  -- même depuis deux caisses différentes.
  article_id uuid not null references articles(id) unique,
  prix_encaisse integer not null,
  created_at timestamptz not null default now()
);

create table clotures (
  id uuid primary key default gen_random_uuid(),
  participation_id uuid not null references participations(id) unique,
  montant_calcule integer not null,
  montant_remis integer,
  invendus_recuperes boolean not null default false,
  invendus_donnes boolean not null default false,
  created_at timestamptz not null default now()
);

-- RLS activé partout, sans policy pour l'instant : tous les accès passent par
-- le serveur Next.js (clé service_role), rien n'est exposé directement au navigateur.
alter table editions enable row level security;
alter table vendeurs enable row level security;
alter table categories enable row level security;
alter table participations enable row level security;
alter table articles enable row level security;
alter table ventes enable row level security;
alter table vente_articles enable row level security;
alter table clotures enable row level security;
