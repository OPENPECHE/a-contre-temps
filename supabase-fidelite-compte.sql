-- ─────────────────────────────────────────────────────────────────────────────
-- FIDÉLITÉ — réservée aux comptes créés. Un numéro ne cumule des tampons que
-- si un compte client a été créé (via /creer-compte). Objectif : capter l'e-mail
-- pour le mailing (nouveaux produits, promos) plutôt que des numéros isolés.
--
-- On n'expose PAS l'e-mail dans cette table publique : il reste dans Supabase
-- Auth. Ici on marque seulement "registered = true" à la création du compte.
--
-- À exécuter dans Supabase → SQL Editor → New query → Run.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.loyalty
  add column if not exists registered boolean not null default false;
