-- Vente au poids sur la caisse du marché
-- Ajoute un marqueur explicite "vendu au poids" sur les produits.
-- Quand sold_by_weight = true, la caisse demande les grammes pesés et calcule
-- le prix = price_per_kg × poids (le prix unitaire "price" est ignoré).
-- Distinct du price_per_kg des pains à format fixe (qui n'est qu'indicatif).

alter table public.products
  add column if not exists sold_by_weight boolean not null default false;
