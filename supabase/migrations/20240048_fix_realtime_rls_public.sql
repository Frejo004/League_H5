-- Migration pour ouvrir l'accès Realtime à tous les utilisateurs (spectateurs incl.)
-- Cela corrige le problème où les mises à jour ne s'affichent pas pour les autres utilisateurs.

-- 1. match_events
DROP POLICY IF EXISTS "match_events: authenticated read" ON public.match_events;
CREATE POLICY "match_events: public read"
  ON public.match_events FOR SELECT
  USING (true);

-- 2. goals
DROP POLICY IF EXISTS "goals: authenticated read" ON public.goals;
CREATE POLICY "goals: public read"
  ON public.goals FOR SELECT
  USING (true);

-- 3. assists
DROP POLICY IF EXISTS "assists: authenticated read" ON public.assists;
CREATE POLICY "assists: public read"
  ON public.assists FOR SELECT
  USING (true);

-- 4. matches
DROP POLICY IF EXISTS "matches: authenticated read" ON public.matches;
CREATE POLICY "matches: public read"
  ON public.matches FOR SELECT
  USING (true);

-- 5. live_reactions
DROP POLICY IF EXISTS "live_reactions: authenticated read" ON public.live_reactions;
CREATE POLICY "live_reactions: public read"
  ON public.live_reactions FOR SELECT
  USING (true);
