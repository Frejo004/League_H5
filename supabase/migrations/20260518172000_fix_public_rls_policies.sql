-- ============================================================
-- Migration: fix_public_rls_policies
-- Description: Allow public/unauthenticated read access (select)
-- for seasons, teams, players, and profiles. This fixes the issue
-- where guest users cannot view matches, standings, stats or scorers.
-- ============================================================

-- 1. SEASONS
DROP POLICY IF EXISTS "seasons: authenticated read" ON public.seasons;
DROP POLICY IF EXISTS "seasons: public read" ON public.seasons;
CREATE POLICY "seasons: public read"
  ON public.seasons FOR SELECT
  USING (true);

-- 2. TEAMS
DROP POLICY IF EXISTS "teams: authenticated read" ON public.teams;
DROP POLICY IF EXISTS "teams: public read" ON public.teams;
CREATE POLICY "teams: public read"
  ON public.teams FOR SELECT
  USING (true);

-- 3. PLAYERS
DROP POLICY IF EXISTS "players: authenticated read" ON public.players;
DROP POLICY IF EXISTS "players: public read" ON public.players;
CREATE POLICY "players: public read"
  ON public.players FOR SELECT
  USING (true);

-- 4. PROFILES
DROP POLICY IF EXISTS "profiles: authenticated read" ON public.profiles;
DROP POLICY IF EXISTS "profiles: public read" ON public.profiles;
CREATE POLICY "profiles: public read"
  ON public.profiles FOR SELECT
  USING (true);
