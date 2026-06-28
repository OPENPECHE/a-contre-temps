-- ════════════════════════════════════════════════════════════════════════════
-- ZONE DE LIVRAISON — à coller dans Supabase
-- ────────────────────────────────────────────────────────────────────────────
-- COMMENT FAIRE :
--   1. Va sur https://supabase.com → ton projet
--   2. Menu de gauche : "SQL Editor"
--   3. Clique "New query", colle TOUT ce fichier, puis clique "Run"
--   4. C'est tout — à ne faire qu'une seule fois.
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Table de configuration de la zone (une seule ligne, id = 1)
create table if not exists delivery_zone (
  id           int primary key default 1,
  center_postal text   default '63000',
  center_lat   double precision default 45.786671,  -- Clermont-Ferrand
  center_lng   double precision default 3.107055,
  radius_km    numeric default 50,
  enabled      boolean default true,
  message      text default 'Nous ne livrons pas encore dans votre zone.',
  constraint delivery_zone_single_row check (id = 1)
);

-- Crée la ligne de config si elle n'existe pas encore
insert into delivery_zone (id) values (1) on conflict (id) do nothing;

-- 2) Coordonnées des points relais (pour les trier du plus proche au plus loin)
alter table pickup_points add column if not exists postal text;
alter table pickup_points add column if not exists lat double precision;
alter table pickup_points add column if not exists lng double precision;

-- 3) Autorisations (RLS) : lecture publique + écriture depuis le back-office
alter table delivery_zone enable row level security;

drop policy if exists "delivery_zone read"  on delivery_zone;
drop policy if exists "delivery_zone write" on delivery_zone;

create policy "delivery_zone read"  on delivery_zone for select using (true);
create policy "delivery_zone write" on delivery_zone for all    using (true) with check (true);
