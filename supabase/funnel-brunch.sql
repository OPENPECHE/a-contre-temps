-- Suivi du parcours de commande brunch (où le client s'arrête + qui rappeler).
-- À lancer une fois dans Supabase → SQL Editor. Sans danger si relancé.

create table if not exists public.funnel_brunch (
  session_id text primary key,
  step       int default 1,
  step_label text default '',
  persons    int,
  address    text,
  slot_date  text,
  slot       text,
  name       text,
  phone      text,
  email      text,
  logged_in  boolean default false,
  paid       boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.funnel_brunch enable row level security;

-- Le tunnel (clé publishable = rôle anon) crée/incrémente sa ligne ; le back-office la lit.
drop policy if exists funnel_anon_insert on public.funnel_brunch;
drop policy if exists funnel_anon_update on public.funnel_brunch;
drop policy if exists funnel_anon_select on public.funnel_brunch;
create policy funnel_anon_insert on public.funnel_brunch for insert to anon with check (true);
create policy funnel_anon_update on public.funnel_brunch for update to anon using (true) with check (true);
create policy funnel_anon_select on public.funnel_brunch for select to anon using (true);

grant select, insert, update on public.funnel_brunch to anon;
