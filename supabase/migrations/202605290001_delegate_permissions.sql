-- Migration: Délégation de permissions pour le live (événements et vidéo)

-- 1. Ajouter les colonnes de délégation sur la table matches
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS events_reporter_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS video_reporter_id  uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Mettre à jour les politiques RLS pour match_events
DROP POLICY IF EXISTS "match_events: admin insert" ON public.match_events;
CREATE POLICY "match_events: admin or reporter insert"
  ON public.match_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    EXISTS (SELECT 1 FROM public.matches WHERE id = match_id AND events_reporter_id = auth.uid())
  );

DROP POLICY IF EXISTS "match_events: admin delete" ON public.match_events;
CREATE POLICY "match_events: admin or reporter delete"
  ON public.match_events FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    EXISTS (SELECT 1 FROM public.matches WHERE id = match_id AND events_reporter_id = auth.uid())
  );

-- 3. Mettre à jour les fonctions de pilotage du live

-- start_match_live
CREATE OR REPLACE FUNCTION public.start_match_live(p_match_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que l'appelant est admin ou le rapporteur d'événements délégué
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    OR
    EXISTS (SELECT 1 FROM matches WHERE id = p_match_id AND events_reporter_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Permission refusée';
  END IF;

  UPDATE matches SET
    status               = 'live',
    live_started_at      = now(),
    live_period          = 1,
    live_minute          = 0,
    played_at            = now(),
    is_paused            = false,
    paused_at            = NULL,
    total_paused_seconds = 0,
    halftime_at          = NULL,
    last_pause_reason    = NULL
  WHERE id = p_match_id AND status = 'scheduled';

  -- Insérer l'événement coup d'envoi
  INSERT INTO match_events (match_id, type, minute, period, created_by)
  VALUES (p_match_id, 'kickoff', 0, 1, auth.uid());
END;
$$;

-- match_halftime
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
    EXISTS (SELECT 1 FROM matches WHERE id = p_match_id AND events_reporter_id = auth.uid())
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

-- end_match_live
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
    live_minute = 20
  WHERE id = p_match_id AND status = 'live';

  INSERT INTO match_events (match_id, type, minute, period, created_by)
  VALUES (p_match_id, 'fulltime', 20, 2, auth.uid());
END;
$$;
