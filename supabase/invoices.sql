-- ─────────────────────────────────────────────────────────────────────────────
-- Factures (back-office) — micro-entreprise, franchise en base de TVA (art. 293 B)
-- Numérotation continue par année : number = "AAAA-NNN" (seq par année).
-- ─────────────────────────────────────────────────────────────────────────────
-- Si une ancienne table "invoices" (mauvais schéma) existe ET qu'elle est VIDE,
-- on la supprime pour la recréer correctement. Si elle contient des données, on
-- ne touche à rien (message d'avertissement) — intervention manuelle alors.
do $$
begin
  if to_regclass('public.invoices') is not null then
    if (select count(*) from public.invoices) = 0 then
      drop table public.invoices cascade;
    else
      raise exception 'Table invoices non vide — vérifiez/migrez le schéma manuellement avant de relancer.';
    end if;
  end if;
end $$;

create table if not exists invoices (
  id           uuid primary key default gen_random_uuid(),
  number       text unique not null,          -- ex. 2026-001
  seq          int  not null,                 -- séquence dans l'année
  year         int  not null,
  issue_date   date not null default current_date,
  service_date date,                          -- date de la prestation / vente
  client_name    text not null,
  client_address text,
  client_siret   text,
  client_email   text,
  items    jsonb   not null default '[]'::jsonb,  -- [{label, qty, pu}]
  total    numeric not null default 0,            -- net, sans TVA
  deposit  numeric not null default 0,            -- acompte déjà versé
  notes    text,
  payment_terms text,
  status   text    not null default 'unpaid',     -- unpaid | paid
  created_at timestamptz not null default now()
);

create index if not exists invoices_year_seq_idx on invoices(year, seq desc);

-- Accès via la clé publique (back-office protégé par code côté client), comme products.
alter table invoices enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename='invoices' and policyname='invoices_anon_all') then
    create policy invoices_anon_all on invoices for all using (true) with check (true);
  end if;
end $$;
