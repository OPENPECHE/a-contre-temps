-- Réglages chiffrés de l'app (taux de charges variables, etc.).
-- À exécuter une fois dans l'éditeur SQL Supabase.
create table if not exists public.app_config (
  key        text primary key,
  value      numeric not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.app_config enable row level security;
drop policy if exists config_read  on public.app_config;
drop policy if exists config_write on public.app_config;
create policy config_read  on public.app_config for select using (true);
create policy config_write on public.app_config for all using (true) with check (true);

-- Taux de charges variables (fraction du coût matière). 0.10 = 10 %.
-- Coût de revient variable = coût matière × (1 + taux), hors main-d'œuvre.
insert into public.app_config (key, value) values
  ('charges_var_pain', 0.10),
  ('charges_var_vienn', 0.10)
on conflict (key) do nothing;
