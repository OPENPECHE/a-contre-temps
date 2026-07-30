-- ─────────────────────────────────────────────────────────────────────────────
-- Corrige l'enregistrement des POINTS RELAIS et MARCHÉS depuis le back-office.
--
-- Problème : les tables pickup_points et market_schedules ont la RLS activée
-- mais AUCUNE politique d'écriture → toute création/modification échoue
-- (erreur 42501 "violates row-level security policy").
--
-- Ces tables ne contiennent que des infos publiques (emplacements, jours de
-- marché), déjà affichées sur le site. On aligne leurs droits sur les autres
-- tables du back-office (products, delivery_rules, box_options…) qui acceptent
-- déjà l'écriture avec la clé publique.
--
-- À exécuter dans Supabase → SQL Editor → New query → Run.
-- ─────────────────────────────────────────────────────────────────────────────

-- POINTS RELAIS ----------------------------------------------------------------
alter table public.pickup_points enable row level security;

drop policy if exists "pickup_points back-office" on public.pickup_points;
create policy "pickup_points back-office"
  on public.pickup_points
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- MARCHÉS (jours) --------------------------------------------------------------
alter table public.market_schedules enable row level security;

drop policy if exists "market_schedules back-office" on public.market_schedules;
create policy "market_schedules back-office"
  on public.market_schedules
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- CRÉNEAUX HORAIRES ------------------------------------------------------------
alter table public.time_slots enable row level security;

drop policy if exists "time_slots back-office" on public.time_slots;
create policy "time_slots back-office"
  on public.time_slots
  for all
  to anon, authenticated
  using (true)
  with check (true);
