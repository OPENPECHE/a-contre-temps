-- Canaux de vente par produit (lisibilité back-office).
-- Sépare le TYPE de produit (cat) de OÙ il est vendu (3 canaux cochables).
-- À exécuter une fois dans l'éditeur SQL Supabase.
alter table public.products add column if not exists sell_market   boolean not null default false;  -- 🛒 marché (caisse)
alter table public.products add column if not exists sell_shipping boolean not null default false;  -- 📦 en ligne — expédition France
alter table public.products add column if not exists sell_delivery boolean not null default false;  -- 🚲 livraison locale

-- Reprise de l'existant : le marché = ancien on_market ; la biscuiterie = expédition.
update public.products set sell_market   = coalesce(on_market, false);
update public.products set sell_shipping = true where cat ilike '%biscuiterie%' or cat ilike '%exp_dition%';
