-- ============================================================
-- Seed — données initiales
-- À exécuter APRÈS les migrations, dans le SQL Editor Supabase
-- ============================================================

-- Promouvoir un utilisateur en admin
-- Remplacez 'votre-email@exemple.com' par l'email du compte admin
update public.profiles
set role = 'admin'
where email = 'votre-email@exemple.com';

-- ============================================================
-- (Optionnel) Saison de démonstration
-- ============================================================
-- insert into public.seasons (name, start_date, end_date, is_active)
-- values ('Saison 2025', '2025-01-01', '2025-06-30', true);
