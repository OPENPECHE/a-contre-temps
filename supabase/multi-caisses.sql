-- Multi-caisses : identifier quelle caisse a réalisé chaque vente.
-- Les caisses (nom + code chiffré) sont définies dans le back-office et stockées
-- dans app_config (clé "caisses", value_text = JSON). Ici on ajoute seulement le
-- tag "caisse" sur chaque vente, pour les statistiques combinées + par caisse.

alter table public.caisse_ventes
  add column if not exists caisse text;
