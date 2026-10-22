-- ─────────────────────────────────────────────────────────────────────────────
-- PROGRAMME DE FIDÉLITÉ — carte à tampons par numéro de téléphone.
--
-- Principe : le numéro de portable EST la carte. Pas de compte, pas de mot de
-- passe. À l'encaissement (caisse au marché) le client tape son numéro sur la
-- tablette → +1 tampon. 10 tampons = un pain offert. Les commandes en ligne
-- créditent le même numéro.
--
-- À exécuter dans Supabase → SQL Editor → New query → Run.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.loyalty (
  phone         text primary key,          -- numéro normalisé (chiffres uniquement)
  name          text,                       -- prénom/nom éventuel (facultatif)
  stamps        integer not null default 0, -- tampons en cours (0 → 9)
  free_breads   integer not null default 0, -- pains offerts à récupérer
  total_stamps  integer not null default 0, -- cumul à vie (statistiques)
  last_order_at timestamptz,
  updated_at    timestamptz not null default now()
);

alter table public.loyalty enable row level security;

drop policy if exists "loyalty public" on public.loyalty;
create policy "loyalty public"
  on public.loyalty
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- Évite de créditer deux fois une même commande en ligne (crédit à la livraison).
alter table public.orders
  add column if not exists loyalty_awarded boolean not null default false;
