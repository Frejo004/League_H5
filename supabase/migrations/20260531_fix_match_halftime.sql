-- Migration : Corriger la fonction match_halftime pour ne pas passer immédiatement en période 2
-- La période 2 ne doit être activée qu'au moment de "Lancer la 2ème mi-temps"
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
      AND (events_reporter_id = auth.uid() OR video_reporter_id = auth.uid())
      AND (finished_at IS NULL OR finished_at > now() - interval '10 minutes')
    )
  ) THEN
    RAISE EXCEPTION 'Permission refusée';
  END IF;

  UPDATE matches SET
    halftime_at  = now()
  WHERE id = p_match_id AND status = 'live';

  INSERT INTO match_events (match_id, type, minute, period, created_by)
  VALUES (p_match_id, 'halftime', 20, 1, auth.uid());
END;
$$;
