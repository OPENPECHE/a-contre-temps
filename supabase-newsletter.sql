-- ════════════════════════════════════════════════════════════════════════════
-- NEWSLETTER — inscrits au "Menu de la semaine"
-- À coller dans Supabase → SQL Editor → New query → Run (une seule fois)
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists newsletter_subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,
  active     boolean default true,
  created_at timestamptz default now()
);

-- Sécurité : la table est verrouillée. Personne ne peut lire/écrire avec la clé
-- publique. Tout passe par les fonctions serveur (/api/subscribe, /api/newsletter)
-- qui utilisent la clé "service_role" (secrète, côté serveur uniquement).
alter table newsletter_subscribers enable row level security;
