-- Migration: Expiration automatique des accès rapporteurs (10 min après la fin)

-- 1. Ajouter la colonne finished_at sur la table matches
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS finished_at timestamptz;

-- 2. Mettre à jour end_match_live pour enregistrer l'heure de fin
CREATE OR REPLACE FUNCTION public.end_match_live(
  p_match_id   uuid,
  p_home_score smallint,
  p_away_score smallint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    OR
    EXISTS (SELECT 1 FROM matches WHERE id = p_match_id AND events_reporter_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Permission refusée';
  END IF;

  UPDATE matches SET
    status      = 'completed',
    home_score  = p_home_score,
    away_score  = p_away_score,
    live_minute = 20,
    finished_at = now()
  WHERE id = p_match_id AND status = 'live';

  INSERT INTO match_events (match_id, type, minute, period, created_by)
  VALUES (p_match_id, 'fulltime', 20, 2, auth.uid());
END;
$$;

-- 3. Mettre à jour les politiques RLS avec la restriction de 10 minutes
-- Note: L'admin n'a pas de restriction de temps, seul le reporter délégué en a une.

DROP POLICY IF EXISTS "match_events: admin or reporter insert" ON public.match_events;
CREATE POLICY "match_events: admin or reporter insert"
  ON public.match_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE id = match_id 
      AND events_reporter_id = auth.uid()
      AND (finished_at IS NULL OR finished_at > now() - interval '10 minutes')
    )
  );

DROP POLICY IF EXISTS "match_events: admin or reporter delete" ON public.match_events;
CREATE POLICY "match_events: admin or reporter delete"
  ON public.match_events FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE id = match_id 
      AND events_reporter_id = auth.uid()
      AND (finished_at IS NULL OR finished_at > now() - interval '10 minutes')
    )
  );

-- 4. Mettre à jour les fonctions de pilotage pour inclure la vérification du temps
-- (Déjà sécurisé par SECURITY DEFINER et la logique interne, mais on renforce)

CREATE OR REPLACE FUNCTION public.match_halftime(p_match_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    OR
    EXISTS (
      SELECT 1 FROM matches 
      WHERE id = p_match_id 
      AND events_reporter_id = auth.uid()
      AND (finished_at IS NULL OR finished_at > now() - interval '10 minutes')
    )
  ) THEN
    RAISE EXCEPTION 'Permission refusée';
  END IF;

  UPDATE matches SET
    live_period  = 2,
    live_minute  = 0,
    halftime_at  = now()
  WHERE id = p_match_id AND status = 'live';

  INSERT INTO match_events (match_id, type, minute, period, created_by)
  VALUES (p_match_id, 'halftime', 20, 1, auth.uid());
END;
$$;
