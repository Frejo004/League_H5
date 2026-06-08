-- ============================================================
-- Migration — Pronostics Buteur / Passeur décisif
-- Résolution 100% automatique à la fin du match
-- ============================================================

-- ── Nouveaux poll_type ────────────────────────────────────────────────────────
-- first_scorer    : Quel joueur marquera le premier but ?
--                   options = [player_id::"Prénom Nom", ..., "Aucun but"]
--                   Le champ correct_option_index pointe sur l'option gagnante
--
-- anytime_scorer  : Quel joueur marquera au moins un but ?
--                   (paris "buteur à tout moment")
--                   options = [player_id::"Prénom Nom", ..., "Aucun but"]
--
-- anytime_assister: Quel joueur donnera une passe décisive ?
--                   options = [player_id::"Prénom Nom", ..., "Aucune passe"]
--
-- Pour ces 3 types, les options sont stockées comme des chaînes "Prénom Nom"
-- et on stocke également le player_id dans poll_meta (JSON) pour la résolution.

-- Ajouter un champ poll_meta JSONB pour stocker les métadonnées par option
-- (notamment le player_id associé à chaque option de joueur)
ALTER TABLE public.polls
  ADD COLUMN IF NOT EXISTS poll_meta JSONB DEFAULT NULL;

-- poll_meta structure pour les types joueur :
-- {
--   "option_player_ids": ["uuid1", "uuid2", ..., null]
--                         null pour la dernière option "Aucun but/passe"
-- }

-- ── Fonction de résolution étendue ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.resolve_match_polls(p_match_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_poll            RECORD;
  v_match           RECORD;
  v_home_score      INT;
  v_away_score      INT;
  v_correct_idx     INT;
  -- Compteurs stats
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
  -- Pour buteur/passeur
  v_first_scorer_id UUID;
  v_option_ids      UUID[];
  v_i               INT;
BEGIN
  -- ── Données du match ─────────────────────────────────────────────────────
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id;
  IF NOT FOUND THEN RETURN; END IF;

  v_home_score := COALESCE(v_match.home_score, 0);
  v_away_score := COALESCE(v_match.away_score, 0);

  -- ── Compteurs stats depuis match_events ──────────────────────────────────
  SELECT COUNT(*) FILTER (WHERE type IN ('goal','own_goal') AND period = 1)
    INTO v_total_goals_ht FROM public.match_events WHERE match_id = p_match_id;
  SELECT COUNT(*) FILTER (WHERE type IN ('goal','own_goal') AND period = 1 AND team_id = v_match.home_team_id)
    INTO v_goals_home_ht FROM public.match_events WHERE match_id = p_match_id;
  SELECT COUNT(*) FILTER (WHERE type IN ('goal','own_goal') AND period = 1 AND team_id = v_match.away_team_id)
    INTO v_goals_away_ht FROM public.match_events WHERE match_id = p_match_id;
  SELECT COUNT(*) INTO v_cards_total FROM public.match_events
    WHERE match_id = p_match_id AND type IN ('yellow_card','red_card');
  SELECT COUNT(*) INTO v_cards_home FROM public.match_events
    WHERE match_id = p_match_id AND type IN ('yellow_card','red_card') AND team_id = v_match.home_team_id;
  SELECT COUNT(*) INTO v_cards_away FROM public.match_events
    WHERE match_id = p_match_id AND type IN ('yellow_card','red_card') AND team_id = v_match.away_team_id;
  SELECT COUNT(*) INTO v_shots_total FROM public.match_events
    WHERE match_id = p_match_id AND type IN ('shot','shot_on_target');
  SELECT COUNT(*) INTO v_shots_home FROM public.match_events
    WHERE match_id = p_match_id AND type IN ('shot','shot_on_target') AND team_id = v_match.home_team_id;
  SELECT COUNT(*) INTO v_shots_away FROM public.match_events
    WHERE match_id = p_match_id AND type IN ('shot','shot_on_target') AND team_id = v_match.away_team_id;
  SELECT COUNT(*) INTO v_corners_total FROM public.match_events
    WHERE match_id = p_match_id AND type = 'corner';
  SELECT COUNT(*) INTO v_fouls_total FROM public.match_events
    WHERE match_id = p_match_id AND type = 'foul';

  v_btts := (
    EXISTS (SELECT 1 FROM public.goals WHERE match_id = p_match_id AND team_id = v_match.home_team_id AND is_own_goal = false)
    AND
    EXISTS (SELECT 1 FROM public.goals WHERE match_id = p_match_id AND team_id = v_match.away_team_id AND is_own_goal = false)
  );

  -- ── Premier buteur (non CSC) ──────────────────────────────────────────────
  -- On cherche dans match_events pour avoir l'ordre chronologique
  SELECT me.player_id INTO v_first_scorer_id
  FROM public.match_events me
  WHERE me.match_id = p_match_id
    AND me.type = 'goal'
    AND me.player_id IS NOT NULL
  ORDER BY me.period ASC, me.minute ASC, me.created_at ASC
  LIMIT 1;
  -- Si aucun goal trouvé dans match_events, on tente dans goals
  IF v_first_scorer_id IS NULL THEN
    SELECT g.player_id INTO v_first_scorer_id
    FROM public.goals g
    WHERE g.match_id = p_match_id AND g.is_own_goal = false
    ORDER BY g.minute ASC, g.created_at ASC
    LIMIT 1;
  END IF;

  -- ── Boucle sur tous les polls du match non résolus ────────────────────────
  FOR v_poll IN
    SELECT * FROM public.polls
    WHERE match_id = p_match_id
      AND status IN ('active', 'closed')
      AND poll_type != 'custom'
  LOOP
    v_correct_idx := NULL;

    CASE v_poll.poll_type

      -- ── Résultats / Stats ─────────────────────────────────────────────────
      WHEN 'winner' THEN
        IF    v_home_score > v_away_score THEN v_correct_idx := 0;
        ELSIF v_home_score = v_away_score THEN v_correct_idx := 1;
        ELSE                                   v_correct_idx := 2;
        END IF;

      WHEN 'btts' THEN
        v_correct_idx := CASE WHEN v_btts THEN 0 ELSE 1 END;

      WHEN 'total_goals' THEN
        v_correct_idx := CASE
          WHEN (v_home_score+v_away_score) <= 1 THEN 0
          WHEN (v_home_score+v_away_score) <= 3 THEN 1
          ELSE 2 END;

      WHEN 'goals_home'    THEN v_correct_idx := LEAST(v_home_score, 3);
      WHEN 'goals_away'    THEN v_correct_idx := LEAST(v_away_score, 3);

      WHEN 'goals_ht'      THEN v_correct_idx := CASE WHEN v_total_goals_ht=0 THEN 0 WHEN v_total_goals_ht=1 THEN 1 ELSE 2 END;
      WHEN 'goals_ht_home' THEN v_correct_idx := CASE WHEN v_goals_home_ht=0 THEN 0 WHEN v_goals_home_ht=1 THEN 1 ELSE 2 END;
      WHEN 'goals_ht_away' THEN v_correct_idx := CASE WHEN v_goals_away_ht=0 THEN 0 WHEN v_goals_away_ht=1 THEN 1 ELSE 2 END;

      WHEN 'cards_total'   THEN v_correct_idx := CASE WHEN v_cards_total<=1 THEN 0 WHEN v_cards_total<=3 THEN 1 ELSE 2 END;
      WHEN 'cards_home'    THEN v_correct_idx := CASE WHEN v_cards_home=0 THEN 0 WHEN v_cards_home=1 THEN 1 ELSE 2 END;
      WHEN 'cards_away'    THEN v_correct_idx := CASE WHEN v_cards_away=0 THEN 0 WHEN v_cards_away=1 THEN 1 ELSE 2 END;
      WHEN 'shots_total'   THEN v_correct_idx := CASE WHEN v_shots_total<=4 THEN 0 WHEN v_shots_total<=9 THEN 1 ELSE 2 END;
      WHEN 'shots_home'    THEN v_correct_idx := CASE WHEN v_shots_home<=4 THEN 0 WHEN v_shots_home<=9 THEN 1 ELSE 2 END;
      WHEN 'shots_away'    THEN v_correct_idx := CASE WHEN v_shots_away<=4 THEN 0 WHEN v_shots_away<=9 THEN 1 ELSE 2 END;
      WHEN 'corners'       THEN v_correct_idx := CASE WHEN v_corners_total<=2 THEN 0 WHEN v_corners_total<=5 THEN 1 ELSE 2 END;
      WHEN 'fouls'         THEN v_correct_idx := CASE WHEN v_fouls_total<=4 THEN 0 WHEN v_fouls_total<=9 THEN 1 ELSE 2 END;

      -- ── Premier buteur ────────────────────────────────────────────────────
      -- poll_meta.option_player_ids = [uuid, uuid, ..., null]
      -- La dernière option (null) = "Aucun but"
      WHEN 'first_scorer' THEN
        -- Extraire le tableau d'UUIDs depuis poll_meta
        SELECT ARRAY(
          SELECT (elem.value #>> '{}')::UUID
          FROM jsonb_array_elements(v_poll.poll_meta->'option_player_ids') WITH ORDINALITY AS elem(value, idx)
        ) INTO v_option_ids;

        IF v_first_scorer_id IS NULL THEN
          -- Aucun but → dernière option
          v_correct_idx := array_length(v_option_ids, 1) - 1;
        ELSE
          v_correct_idx := NULL;
          FOR v_i IN 1..array_length(v_option_ids, 1) LOOP
            IF v_option_ids[v_i] = v_first_scorer_id THEN
              v_correct_idx := v_i - 1; -- 0-indexed
              EXIT;
            END IF;
          END LOOP;
          -- Si le joueur n'est pas dans la liste (CSC ou joueur absent), on laisse NULL
        END IF;

      -- ── Buteur à tout moment ──────────────────────────────────────────────
      -- Vrai si le joueur sélectionné a marqué AU MOINS un but (non CSC)
      WHEN 'anytime_scorer' THEN
        SELECT ARRAY(
          SELECT (elem.value #>> '{}')::UUID
          FROM jsonb_array_elements(v_poll.poll_meta->'option_player_ids') WITH ORDINALITY AS elem(value, idx)
        ) INTO v_option_ids;

        v_correct_idx := NULL;
        -- Chercher quel joueur (parmi les options) a marqué
        FOR v_i IN 1..array_length(v_option_ids, 1) LOOP
          IF v_option_ids[v_i] IS NULL THEN
            -- Option "Aucun but" : vraie si aucun but dans le match
            IF (v_home_score + v_away_score) = 0 THEN
              v_correct_idx := v_i - 1;
              EXIT;
            END IF;
          ELSE
            IF EXISTS (
              SELECT 1 FROM public.goals
              WHERE match_id = p_match_id
                AND player_id = v_option_ids[v_i]
                AND is_own_goal = false
            ) THEN
              v_correct_idx := v_i - 1;
              EXIT;
            END IF;
          END IF;
        END LOOP;

      -- ── Passeur décisif à tout moment ────────────────────────────────────
      WHEN 'anytime_assister' THEN
        SELECT ARRAY(
          SELECT (elem.value #>> '{}')::UUID
          FROM jsonb_array_elements(v_poll.poll_meta->'option_player_ids') WITH ORDINALITY AS elem(value, idx)
        ) INTO v_option_ids;

        v_correct_idx := NULL;
        FOR v_i IN 1..array_length(v_option_ids, 1) LOOP
          IF v_option_ids[v_i] IS NULL THEN
            -- Option "Aucune passe" : vraie si aucune passe décisive
            IF NOT EXISTS (SELECT 1 FROM public.assists WHERE match_id = p_match_id) THEN
              v_correct_idx := v_i - 1;
              EXIT;
            END IF;
          ELSE
            IF EXISTS (
              SELECT 1 FROM public.assists
              WHERE match_id = p_match_id
                AND player_id = v_option_ids[v_i]
            ) THEN
              v_correct_idx := v_i - 1;
              EXIT;
            END IF;
          END IF;
        END LOOP;

      ELSE
        v_correct_idx := NULL;
    END CASE;

    -- ── Mettre à jour le poll ─────────────────────────────────────────────
    UPDATE public.polls
    SET status = 'completed', correct_option_index = v_correct_idx
    WHERE id = v_poll.id;

    -- ── Mettre à jour les predictions (3 pts si correct) ─────────────────
    IF v_correct_idx IS NOT NULL THEN
      UPDATE public.predictions
      SET
        is_correct    = (option_index = v_correct_idx),
        points_earned = CASE WHEN option_index = v_correct_idx THEN 3 ELSE 0 END
      WHERE poll_id = v_poll.id;

      -- ── Résolution des bulletins de paris ────────────────────────────────
      PERFORM public.resolve_bet_slips_for_poll(v_poll.id, v_correct_idx);
    END IF;

  END LOOP;

  -- ── Fermer les polls custom (sans résolution) ─────────────────────────────
  UPDATE public.polls
  SET status = 'completed'
  WHERE match_id = p_match_id
    AND status IN ('active', 'closed')
    AND poll_type = 'custom';

END;
$$;

-- ── Trigger déjà en place, on le recrée proprement ───────────────────────────
CREATE OR REPLACE FUNCTION public.on_match_completed_resolve_polls()
RETURNS trigger LANGUAGE plpgsql AS $$
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

DROP TRIGGER IF EXISTS match_live_close_polls ON public.matches;
CREATE OR REPLACE FUNCTION public.on_match_live_close_polls()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'live' AND OLD.status IS DISTINCT FROM 'live' THEN
    UPDATE public.polls SET status = 'closed'
    WHERE match_id = NEW.id AND status = 'active';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER match_live_close_polls
  AFTER UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.on_match_live_close_polls();
