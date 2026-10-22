-- Colonnes de suivi des commandes (back-office)
--   paid           : la commande est-elle réglée ? (vrai auto si payé en ligne)
--   confirm_mailed : l'e-mail « commande confirmée » a-t-il déjà été envoyé ?
-- À exécuter une fois dans l'éditeur SQL Supabase.

alter table public.orders add column if not exists paid boolean not null default false;
alter table public.orders add column if not exists confirm_mailed boolean not null default false;

-- Marque comme déjà réglées les commandes payées en ligne existantes.
update public.orders
set paid = true
where paid = false
  and (lower(coalesce(payment_method,'')) like '%ligne%'
       or lower(coalesce(payment_method,'')) like '%sumup%');
