-- ─────────────────────────────────────────────────────────────────────────────
-- FIDÉLITÉ — historique client : rattache chaque vente de la caisse au numéro
-- de téléphone, pour afficher ce que le client consomme habituellement et
-- décider quoi lui offrir au 10e passage (sa récompense = son produit habituel,
-- pas forcément 5 € de pain).
--
-- À exécuter dans Supabase → SQL Editor → New query → Run.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.caisse_ventes
  add column if not exists phone text;

create index if not exists caisse_ventes_phone_idx
  on public.caisse_ventes (phone);
