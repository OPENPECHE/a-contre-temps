-- Affichage du ticket (QR) sur la borne client : l'URL du ticket transite par pos_link.
-- À exécuter une fois dans l'éditeur SQL Supabase.
alter table public.pos_link add column if not exists ticket text;
