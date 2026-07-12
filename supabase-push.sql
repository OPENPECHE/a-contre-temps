-- ════════════════════════════════════════════════════════════════════════════
-- NOTIFICATIONS PUSH — abonnements des téléphones
-- À coller dans Supabase → SQL Editor → New query → Run (une seule fois)
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  endpoint   text unique not null,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz default now()
);

-- Table verrouillée : tout passe par les fonctions serveur (/api/save-push,
-- /api/send-push) qui utilisent la clé service_role.
alter table push_subscriptions enable row level security;
