-- ============================================================
-- Migration — Automatisation des pronostics
-- ============================================================

-- 1. Nouveaux champs sur polls
ALTER TABLE public.polls
  ADD COLUMN IF NOT EXISTS poll_type TEXT NOT NULL DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS correct_option_index INT DEFAULT NULL;

-- poll_type valeurs possibles :
--   custom       → sondage libre (pas de résolution auto)
--   winner       → Victoire domicile / Nul / Victoire extérieur
--   btts         → Les deux équipes marquent ? (Oui / Non)
--   total_goals  → Total de buts (tranches : 0-1 / 2-3 / 4+)
--   goals_home   → Buts équipe domicile (tranches)
--   goals_away   → Buts équipe extérieur (tranches)
--   goals_ht     → Buts à la mi-temps (tranches)
--   goals_ht_home → Buts domicile à la mi-temps
--   goals_ht_away → Buts extérieur à la mi-temps
--   cards_total  → Total cartons dans le match (tranches)
--   cards_home   → Cartons équipe domicile (tranches)
--   cards_away   → Cartons équipe extérieur (tranches)
--   shots_total  → Total tirs dans le match (tranches)
--   shots_home   → Tirs équipe domicile (tranches)
--   shots_away   → Tirs équipe extérieur (tranches)
--   corners      → Total corners (tranches)
--   fouls        → Total fautes (tranches)

-- 2. Nouveaux champs sur predictions
ALTER TABLE public.predictions
  ADD COLUMN IF NOT EXISTS is_correct BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS points_earned INT NOT NULL DEFAULT 0;

-- 3. Index pour le leaderboard
CREATE INDEX IF NOT EXISTS predictions_is_correct_idx ON public.predictions(is_correct);
CREATE INDEX IF NOT EXISTS predictions_points_idx ON public.predictions(points_earned);

-- ============================================================
-- Fonction utilitaire : résoudre un sondage automatiquement
-- Appelée depuis end_match_live quand le match se termine
-- ============================================================
CREATE OR REPLACE FUNCTION public.resolve_match_polls(p_match_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_poll        RECORD;
  v_match       RECORD;
  v_home_score  INT;
  v_away_score  INT;
  v_correct_idx INT;
  -- Compteurs depuis match_events
  v_total_goals_ht  INT;
  v_goals_home_ht   INT;
  v_goals_away_ht   INT;
  v_cards_total     INT;
  v_cards_home      INT;
  v_cards_away      INT;
  v_shots_total     INT;
  v_shots_home      INT;
  v_shots_away      INT;
  v_corners_total   INT;
  v_fouls_total     INT;
  v_btts            BOOLEAN;
BEGIN
  -- Récupérer les données du match
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id;
  IF NOT FOUND THEN RETURN; END IF;

  v_home_score := COALESCE(v_match.home_score, 0);
  v_away_score := COALESCE(v_match.away_score, 0);

  -- Pré-calculer tous les compteurs depuis match_events (1 seule passe)
  SELECT
    COUNT(*) FILTER (WHERE type IN ('goal','own_goal') AND period = 1)                            INTO v_total_goals_ht
    FROM public.match_events WHERE match_id = p_match_id;

  SELECT
    COUNT(*) FILTER (WHERE type IN ('goal','own_goal') AND period = 1 AND team_id = v_match.home_team_id)
    INTO v_goals_home_ht
    FROM public.match_events WHERE match_id = p_match_id;

  SELECT
    COUNT(*) FILTER (WHERE type IN ('goal','own_goal') AND period = 1 AND team_id = v_match.away_team_id)
    INTO v_goals_away_ht
    FROM public.match_events WHERE match_id = p_match_id;

  SELECT COUNT(*) INTO v_cards_total
    FROM public.match_events
    WHERE match_id = p_match_id AND type IN ('yellow_card','red_card');

  SELECT COUNT(*) INTO v_cards_home
    FROM public.match_events
    WHERE match_id = p_match_id AND type IN ('yellow_card','red_card') AND team_id = v_match.home_team_id;

  SELECT COUNT(*) INTO v_cards_away
    FROM public.match_events
    WHERE match_id = p_match_id AND type IN ('yellow_card','red_card') AND team_id = v_match.away_team_id;

  SELECT COUNT(*) INTO v_shots_total
    FROM public.match_events
    WHERE match_id = p_match_id AND type IN ('shot','shot_on_target');

  SELECT COUNT(*) INTO v_shots_home
    FROM public.match_events
    WHERE match_id = p_match_id AND type IN ('shot','shot_on_target') AND team_id = v_match.home_team_id;

  SELECT COUNT(*) INTO v_shots_away
    FROM public.match_events
    WHERE match_id = p_match_id AND type IN ('shot','shot_on_target') AND team_id = v_match.away_team_id;

  SELECT COUNT(*) INTO v_corners_total
    FROM public.match_events
    WHERE match_id = p_match_id AND type = 'corner';

  SELECT COUNT(*) INTO v_fouls_total
    FROM public.match_events
    WHERE match_id = p_match_id AND type = 'foul';

  -- BTTS : les deux équipes ont-elles marqué ?
  v_btts := (
    EXISTS (SELECT 1 FROM public.goals WHERE match_id = p_match_id AND team_id = v_match.home_team_id AND is_own_goal = false)
    AND
    EXISTS (SELECT 1 FROM public.goals WHERE match_id = p_match_id AND team_id = v_match.away_team_id AND is_own_goal = false)
  );

  -- Boucler sur tous les sondages liés à ce match non encore résolus
  FOR v_poll IN
    SELECT * FROM public.polls
    WHERE match_id = p_match_id
      AND status IN ('active', 'closed')
      AND poll_type != 'custom'
  LOOP
    v_correct_idx := NULL;

    CASE v_poll.poll_type

      -- ── Vainqueur ─────────────────────────────────────────
      WHEN 'winner' THEN
        -- options[0] = domicile, [1] = nul, [2] = extérieur
        IF    v_home_score > v_away_score THEN v_correct_idx := 0;
        ELSIF v_home_score = v_away_score THEN v_correct_idx := 1;
        ELSE                                   v_correct_idx := 2;
        END IF;

      -- ── BTTS ──────────────────────────────────────────────
      WHEN 'btts' THEN
        -- options[0] = Oui, [1] = Non
        v_correct_idx := CASE WHEN v_btts THEN 0 ELSE 1 END;

      -- ── Total buts match ──────────────────────────────────
      WHEN 'total_goals' THEN
        -- options[0] = 0-1, [1] = 2-3, [2] = 4+
        v_correct_idx := CASE
          WHEN (v_home_score + v_away_score) <= 1 THEN 0
          WHEN (v_home_score + v_away_score) <= 3 THEN 1
          ELSE 2
        END;

      -- ── Buts domicile ─────────────────────────────────────
      WHEN 'goals_home' THEN
        -- options[0] = 0, [1] = 1, [2] = 2, [3] = 3+
        v_correct_idx := LEAST(v_home_score, 3);

      -- ── Buts extérieur ────────────────────────────────────
      WHEN 'goals_away' THEN
        v_correct_idx := LEAST(v_away_score, 3);

      -- ── Buts MT (total) ───────────────────────────────────
      WHEN 'goals_ht' THEN
        -- options[0] = 0, [1] = 1, [2] = 2+
        v_correct_idx := CASE
          WHEN v_total_goals_ht = 0 THEN 0
          WHEN v_total_goals_ht = 1 THEN 1
          ELSE 2
        END;

      -- ── Buts domicile MT ──────────────────────────────────
      WHEN 'goals_ht_home' THEN
        v_correct_idx := CASE
          WHEN v_goals_home_ht = 0 THEN 0
          WHEN v_goals_home_ht = 1 THEN 1
          ELSE 2
        END;

      -- ── Buts extérieur MT ─────────────────────────────────
      WHEN 'goals_ht_away' THEN
        v_correct_idx := CASE
          WHEN v_goals_away_ht = 0 THEN 0
          WHEN v_goals_away_ht = 1 THEN 1
          ELSE 2
        END;

      -- ── Cartons total ─────────────────────────────────────
      WHEN 'cards_total' THEN
        -- options[0] = 0-1, [1] = 2-3, [2] = 4+
        v_correct_idx := CASE
          WHEN v_cards_total <= 1 THEN 0
          WHEN v_cards_total <= 3 THEN 1
          ELSE 2
        END;

      -- ── Cartons domicile ──────────────────────────────────
      WHEN 'cards_home' THEN
        -- options[0] = 0, [1] = 1, [2] = 2+
        v_correct_idx := CASE
          WHEN v_cards_home = 0 THEN 0
          WHEN v_cards_home = 1 THEN 1
          ELSE 2
        END;

      -- ── Cartons extérieur ─────────────────────────────────
      WHEN 'cards_away' THEN
        v_correct_idx := CASE
          WHEN v_cards_away = 0 THEN 0
          WHEN v_cards_away = 1 THEN 1
          ELSE 2
        END;

      -- ── Tirs total ────────────────────────────────────────
      WHEN 'shots_total' THEN
        -- options[0] = 0-4, [1] = 5-9, [2] = 10+
        v_correct_idx := CASE
          WHEN v_shots_total <= 4  THEN 0
          WHEN v_shots_total <= 9  THEN 1
          ELSE 2
        END;

      -- ── Tirs domicile ─────────────────────────────────────
      WHEN 'shots_home' THEN
        v_correct_idx := CASE
          WHEN v_shots_home <= 4  THEN 0
          WHEN v_shots_home <= 9  THEN 1
          ELSE 2
        END;

      -- ── Tirs extérieur ────────────────────────────────────
      WHEN 'shots_away' THEN
        v_correct_idx := CASE
          WHEN v_shots_away <= 4  THEN 0
          WHEN v_shots_away <= 9  THEN 1
          ELSE 2
        END;

      -- ── Corners ───────────────────────────────────────────
      WHEN 'corners' THEN
        -- options[0] = 0-2, [1] = 3-5, [2] = 6+
        v_correct_idx := CASE
          WHEN v_corners_total <= 2 THEN 0
          WHEN v_corners_total <= 5 THEN 1
          ELSE 2
        END;

      -- ── Fautes ────────────────────────────────────────────
      WHEN 'fouls' THEN
        -- options[0] = 0-4, [1] = 5-9, [2] = 10+
        v_correct_idx := CASE
          WHEN v_fouls_total <= 4 THEN 0
          WHEN v_fouls_total <= 9 THEN 1
          ELSE 2
        END;

      ELSE
        v_correct_idx := NULL;
    END CASE;

    -- Mettre à jour le sondage
    UPDATE public.polls
    SET status = 'completed', correct_option_index = v_correct_idx
    WHERE id = v_poll.id;

    -- Mettre à jour les prédictions (points : 3 pts si correct)
    IF v_correct_idx IS NOT NULL THEN
      UPDATE public.predictions
      SET
        is_correct    = (option_index = v_correct_idx),
        points_earned = CASE WHEN option_index = v_correct_idx THEN 3 ELSE 0 END
      WHERE poll_id = v_poll.id;
    END IF;

  END LOOP;

  -- Fermer les sondages custom liés au match (sans les résoudre)
  UPDATE public.polls
  SET status = 'completed'
  WHERE match_id = p_match_id
    AND status IN ('active', 'closed')
    AND poll_type = 'custom';

END;
$$;

-- ============================================================
-- Trigger : appel automatique quand end_match_live termine un match
-- ============================================================
CREATE OR REPLACE FUNCTION public.on_match_completed_resolve_polls()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    PERFORM public.resolve_match_polls(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS match_completed_resolve_polls ON public.matches;
CREATE TRIGGER match_completed_resolve_polls
  AFTER UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.on_match_completed_resolve_polls();

-- ============================================================
-- Trigger : fermer les sondages quand le match démarre (status → live)
-- ============================================================
CREATE OR REPLACE FUNCTION public.on_match_live_close_polls()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'live' AND OLD.status IS DISTINCT FROM 'live' THEN
    UPDATE public.polls
    SET status = 'closed'
    WHERE match_id = NEW.id AND status = 'active';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS match_live_close_polls ON public.matches;
CREATE TRIGGER match_live_close_polls
  AFTER UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.on_match_live_close_polls();

-- ============================================================
-- Vue : classement des pronostiqueurs par saison
-- ============================================================
CREATE OR REPLACE VIEW public.predictions_leaderboard AS
SELECT
  pr.user_id,
  p.season_id,
  prof.full_name,
  prof.avatar_url,
  COUNT(*)                              AS total_predictions,
  COUNT(*) FILTER (WHERE pr.is_correct) AS correct_predictions,
  SUM(pr.points_earned)                 AS total_points,
  ROUND(
    COUNT(*) FILTER (WHERE pr.is_correct)::NUMERIC
    / NULLIF(COUNT(*), 0) * 100, 1
  )                                     AS success_rate
FROM public.predictions pr
JOIN public.polls p ON p.id = pr.poll_id
JOIN public.profiles prof ON prof.id = pr.user_id
WHERE pr.is_correct IS NOT NULL
GROUP BY pr.user_id, p.season_id, prof.full_name, prof.avatar_url;

-- RLS sur la vue (lecture publique pour les authentifiés)
GRANT SELECT ON public.predictions_leaderboard TO authenticated;
