-- Matières premières : prix d'achat au kg (source unique pour tous les calculs de coût).
-- À exécuter une fois dans l'éditeur SQL Supabase.
create table if not exists public.matieres (
  nom        text primary key,
  prix_kg    numeric not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.matieres enable row level security;
drop policy if exists matieres_read  on public.matieres;
drop policy if exists matieres_write on public.matieres;
create policy matieres_read  on public.matieres for select using (true);
create policy matieres_write on public.matieres for all using (true) with check (true);

-- Données actuelles (issues des fiches recette Pétrin). Modifiables ensuite au back-office.
insert into public.matieres (nom, prix_kg) values
  ('Farine blé T65', 1.24),
  ('Farine blé T80', 1.31),
  ('Farine meule T80', 1.31),
  ('Farine blé complète T110', 1.24),
  ('Farine blé intégrale T150', 1.24),
  ('Farine seigle T130', 1.24),
  ('Farine engrain', 3.11),
  ('Farine blé T55', 2.10),
  ('Sel', 1.75),
  ('Sel fin', 0.41),
  ('Sucre', 0.90),
  ('Levure', 2.51),
  ('Poudre de lait', 7.23),
  ('Œuf', 5.60),
  ('Œuf (jaune)', 5.60),
  ('Œuf (blanc)', 5.60),
  ('Beurre doux', 7.86),
  ('Beurre de tourage', 9.84),
  ('Lait', 1.00),
  ('Crème pâtissière', 4.80),
  ('Mélange fruits', 10.00),
  ('Mélange graines torréfiées', 5.58),
  ('Son', 0.51),
  ('Graines de lin', 5.00),
  ('B1', 1.25),
  ('Levain blé', 0.622),
  ('Levain petit épeautre', 1.096),
  ('Eau', 0.003)
on conflict (nom) do nothing;
