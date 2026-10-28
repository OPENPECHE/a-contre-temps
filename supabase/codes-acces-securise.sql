-- Codes d'accès admin + caisse, centralisés et chiffrés.
-- app_config.value est NUMERIC (taux de charges) et ne peut pas stocker un hash.
-- On ajoute une colonne texte pour les valeurs non numériques (hash SHA-256 des codes).
-- Les clés utilisées : admin_pin_hash, caisse_pin_hash (valeur = hash hexadécimal).

alter table public.app_config
  add column if not exists value_text text;

-- Permet d'insérer une ligne avec seulement (key, value_text), sans value numérique.
alter table public.app_config
  alter column value drop not null;
