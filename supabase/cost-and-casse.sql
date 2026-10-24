-- Coût de revient par produit + table de casse (invendus périmés).
-- À exécuter une fois dans l'éditeur SQL Supabase.

-- 1) Coût de revient unitaire par produit (matières chargées).
alter table public.products add column if not exists cost numeric;

-- 2) Table de la casse.
create table if not exists public.casse (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lieu       text,
  items      jsonb not null default '[]'::jsonb,   -- [{name, qty, cost, pv}]
  total_cost numeric not null default 0,
  total_pv   numeric not null default 0
);
alter table public.casse enable row level security;
drop policy if exists casse_read  on public.casse;
drop policy if exists casse_write on public.casse;
create policy casse_read  on public.casse for select using (true);
create policy casse_write on public.casse for insert with check (true);
