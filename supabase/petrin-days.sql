-- Synchro des commandes du pétrin (PC bureau ↔ tablette fournil).
-- Une ligne par jour : day (YYYY-MM-DD), data (quantités par pain), updated_at.
-- À exécuter une fois dans l'éditeur SQL Supabase.

create table if not exists public.petrin_days (
  day         text primary key,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.petrin_days enable row level security;

-- Outil interne (page /petrin en noindex) : lecture + écriture avec la clé publique.
drop policy if exists petrin_read  on public.petrin_days;
drop policy if exists petrin_write on public.petrin_days;
drop policy if exists petrin_upd   on public.petrin_days;
create policy petrin_read  on public.petrin_days for select using (true);
create policy petrin_write on public.petrin_days for insert with check (true);
create policy petrin_upd   on public.petrin_days for update using (true) with check (true);
