-- ─────────────────────────────────────────────────────────────────────────────
-- CAISSE MARCHÉS — à contre-temps
-- À lancer dans Supabase (SQL Editor). Crée 2 tables + RLS (écriture anon) + seed.
-- ─────────────────────────────────────────────────────────────────────────────

-- Articles vendus à l'unité sur les marchés (liste éditable depuis la caisse)
create table if not exists caisse_articles (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  price      numeric(8,2) not null default 0,   -- prix TTC en euros
  color      text default '#7C97AC',
  category   text,
  position   int default 0,
  active     boolean default true,
  created_at timestamptz default now()
);
alter table caisse_articles enable row level security;
drop policy if exists caisse_articles_all on caisse_articles;
create policy caisse_articles_all on caisse_articles
  for all to anon, authenticated using (true) with check (true);

-- Ventes encaissées (une « note » = une vente)
create table if not exists caisse_ventes (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz default now(),
  local_id       text,                 -- id généré par la tablette (déduplication hors-ligne)
  total          numeric(10,2) not null,
  payment_method text not null,         -- 'especes' | 'carte' | 'sumup'
  items          jsonb not null default '[]'::jsonb,  -- [{name, price, qty}]
  sumup_tx_id    text,
  note           text
);
alter table caisse_ventes enable row level security;
drop policy if exists caisse_ventes_all on caisse_ventes;
create policy caisse_ventes_all on caisse_ventes
  for all to anon, authenticated using (true) with check (true);
-- évite les doublons quand la tablette resynchronise une vente déjà envoyée
create unique index if not exists caisse_ventes_local_id_uq
  on caisse_ventes(local_id) where local_id is not null;

-- Articles de départ (prix À AJUSTER depuis la caisse → bouton « Articles »)
insert into caisse_articles (name, price, color, category, position) values
  ('Pain au levain',    4.50, '#A6713F', 'Pains',          1),
  ('Demi-pain',         2.50, '#A6713F', 'Pains',          2),
  ('Baguette',          1.20, '#A6713F', 'Pains',          3),
  ('Pain spécial',      5.00, '#A6713F', 'Pains',          4),
  ('Croissant',         1.20, '#C2843E', 'Viennoiseries',  5),
  ('Pain au chocolat',  1.30, '#C2843E', 'Viennoiseries',  6),
  ('Brioche',           4.00, '#C2843E', 'Viennoiseries',  7),
  ('Cookie',            2.00, '#7C8B5E', 'Biscuiterie',    8),
  ('Sablés (sachet)',   5.00, '#7C8B5E', 'Biscuiterie',    9),
  ('Fondant chocolat',  3.50, '#7C8B5E', 'Biscuiterie',   10)
on conflict do nothing;

-- ─── Factures (numérotation séquentielle par année) ───────────────────────────
create table if not exists caisse_factures (
  id              uuid primary key default gen_random_uuid(),
  numero          text not null,          -- ex "2026-0001"
  annee           int  not null,
  seq             int  not null,
  created_at      timestamptz default now(),
  client_nom      text,
  client_adresse  text,
  client_email    text,
  items           jsonb not null default '[]'::jsonb,
  total           numeric(10,2) not null,
  payment_method  text,
  vente_local_id  text
);
alter table caisse_factures enable row level security;
drop policy if exists caisse_factures_all on caisse_factures;
create policy caisse_factures_all on caisse_factures
  for all to anon, authenticated using (true) with check (true);
create unique index if not exists caisse_factures_annee_seq_uq on caisse_factures(annee, seq);
