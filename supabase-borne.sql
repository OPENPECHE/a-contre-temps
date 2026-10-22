-- ─────────────────────────────────────────────────────────────────────────────
-- BORNE CLIENT — liaison entre la tablette vendeur (caisse) et la tablette
-- client (borne). La caisse déclenche une demande de numéro ; la borne affiche
-- le pavé, le client tape, et le numéro revient sur la caisse.
--
-- Les deux tablettes partagent un même "code" (ex. ENNEZAT) et doivent être
-- connectées à internet (même partage de connexion que le SumUp).
--
-- À exécuter dans Supabase → SQL Editor → New query → Run.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.pos_link (
  code       text primary key,              -- code d'appairage partagé
  state      text not null default 'idle',  -- idle | asking | done
  phone      text,                          -- numéro tapé par le client
  amount     numeric,                       -- montant de la vente (affiché sur la borne)
  label      text,                          -- libellé éventuel
  updated_at timestamptz not null default now()
);

alter table public.pos_link enable row level security;

drop policy if exists "pos_link public" on public.pos_link;
create policy "pos_link public"
  on public.pos_link for all
  to anon, authenticated
  using (true) with check (true);
