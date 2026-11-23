-- Bons cadeaux « Offrir un brunch »
-- RLS activée SANS policy anon → aucun accès par la clé publique.
-- Seule la clé service_role (API /api/voucher) peut lire/écrire (elle contourne la RLS).

create table if not exists gift_vouchers (
  id              uuid primary key default gen_random_uuid(),
  code            text unique not null,
  amount          numeric not null default 0,      -- valeur du bon (€)
  persons         int,                             -- nb de personnes offert (indicatif)
  status          text not null default 'active',  -- active | used
  buyer_name      text,
  buyer_email     text,
  recipient_name  text,
  recipient_email text,
  message         text,
  order_id        uuid,                            -- commande qui a consommé le bon
  created_at      timestamptz not null default now(),
  redeemed_at     timestamptz
);

alter table gift_vouchers enable row level security;
-- (volontairement aucune policy : la clé anon est donc refusée)

create index if not exists gift_vouchers_code_idx on gift_vouchers(code);
