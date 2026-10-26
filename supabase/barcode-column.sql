-- Colonne code-barres manquante sur products.
-- L'editeur du back-office et le scan douchette de la caisse l'utilisent,
-- mais la colonne n'avait jamais ete creee -> l'enregistrement d'un produit
-- echouait (400 : "Could not find the 'barcode' column").

alter table public.products
  add column if not exists barcode text;
