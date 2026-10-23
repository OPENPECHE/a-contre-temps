-- Code-barres produit (douchette USB à la caisse)
-- À exécuter une fois dans l'éditeur SQL Supabase.
alter table public.products add column if not exists barcode text;

-- Recherche rapide par code-barres (optionnel mais recommandé).
create index if not exists products_barcode_idx on public.products (barcode) where barcode is not null;
