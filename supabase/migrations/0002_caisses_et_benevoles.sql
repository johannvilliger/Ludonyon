-- Caisses (avec fonds de départ et vidages tracés) et règles bénévoles.

create table caisses (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references editions(id) on delete cascade,
  nom text not null,
  fond_initial integer not null default 250,
  created_at timestamptz not null default now()
);

-- Remplace le champ texte libre par une vraie référence, et ajoute la case
-- "acheteur bénévole" (décochée par défaut) qui dispense du +10%.
alter table ventes drop column caisse_id;
alter table ventes add column caisse_id uuid not null references caisses(id);
alter table ventes add column acheteur_benevole boolean not null default false;

-- Vidage de caisse : montant retiré, par qui, quand — pour la traçabilité du cash.
create table mouvements_caisse (
  id uuid primary key default gen_random_uuid(),
  caisse_id uuid not null references caisses(id) on delete cascade,
  montant integer not null check (montant > 0),
  effectue_par text,
  created_at timestamptz not null default now()
);

-- Un vendeur bénévole n'a pas les 10% retenus sur ses ventes. Ce champ n'est
-- jamais rempli par le formulaire public de dépôt : uniquement depuis
-- l'accueil/contrôle, réservé au comité.
alter table participations add column est_benevole boolean not null default false;

-- Deux taux distincts plutôt qu'un seul : celui ajouté au prix payé par
-- l'acheteur, et celui retenu sur le gain du vendeur. Valent 10% chacun
-- aujourd'hui, mais rien n'impose qu'ils restent égaux à l'avenir.
alter table editions rename column taux_commission to taux_achat;
alter table editions add column taux_vendeur numeric(4,3) not null default 0.10;

alter table caisses enable row level security;
alter table mouvements_caisse enable row level security;
