-- ============================================================
-- Migration — Bulletins de paris (bet_slips)
-- Paris simples et combinés avec validation explicite
-- ============================================================

-- ── Types ─────────────────────────────────────────────────────────────────────

CREATE TYPE bet_slip_type   AS ENUM ('simple', 'combo');
CREATE TYPE bet_slip_status AS ENUM ('pending', 'won', 'lost', 'void');

-- ── Table bet_slips ───────────────────────────────────────────────────────────
-- Un bulletin regroupe une ou plusieurs sélections soumises en une fois.
-- simple : chaque sélection est évaluée indépendamment
-- combo  : toutes les sélections doivent être correctes, sinon le bulletin est perdu

CREATE TABLE public.bet_slips (
  id         UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID             NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  season_id  UUID             NOT NULL REFERENCES public.seasons(id)  ON DELETE CASCADE,
  type       bet_slip_type    NOT NULL DEFAULT 'simple',
  status     bet_slip_status  NOT NULL DEFAULT 'pending',
  -- Points attribués au moment de la résolution (0 tant que pending)
  points_earned INT           NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ     DEFAULT NULL
);

CREATE INDEX bet_slips_user_idx   ON public.bet_slips(user_id);
CREATE INDEX bet_slips_season_idx ON public.bet_slips(season_id);
CREATE INDEX bet_slips_status_idx ON public.bet_slips(status);

-- ── Table bet_slip_selections ─────────────────────────────────────────────────
-- Chaque ligne = un pronostic dans un bulletin.
-- Lie directement à polls + option choisie (pas à predictions).

CREATE TABLE public.bet_slip_selections (
  id           UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  slip_id      UUID  NOT NULL REFERENCES public.bet_slips(id) ON DELETE CASCADE,
  poll_id      UUID  NOT NULL REFERENCES public.polls(id)     ON DELETE CASCADE,
  option_index INT   NOT NULL,
  -- Rempli lors de la résolution automatique
  is_correct   BOOLEAN DEFAULT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Pas deux sélections sur le même poll dans le même bulletin
  UNIQUE(slip_id, poll_id)
);

CREATE INDEX bet_slip_selections_slip_idx ON public.bet_slip_selections(slip_id);
CREATE INDEX bet_slip_selections_poll_idx ON public.bet_slip_selections(poll_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.bet_slips           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bet_slip_selections ENABLE ROW LEVEL SECURITY;

-- bet_slips : lecture et création pour l'utilisateur propriétaire
CREATE POLICY "bet_slips: read own"
  ON public.bet_slips FOR SELECT
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY "bet_slips: insert own"
  ON public.bet_slips FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

-- bet_slip_selections : lecture si on est propriétaire du bulletin
CREATE POLICY "bet_slip_selections: read own"
  ON public.bet_slip_selections FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.bet_slips s
      WHERE s.id = slip_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "bet_slip_selections: insert own"
  ON public.bet_slip_selections FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bet_slips s
      WHERE s.id = slip_id AND s.user_id = auth.uid()
    )
  );

-- ── Fonction : soumettre un bulletin en une transaction ───────────────────────
-- Appelée depuis le client, garantit l'atomicité
-- p_user_id   : auth.uid()
-- p_season_id : saison active
-- p_type      : 'simple' ou 'combo'
-- p_selections: JSON array [{poll_id, option_index}, ...]

CREATE OR REPLACE FUNCTION public.submit_bet_slip(
  p_user_id    UUID,
  p_season_id  UUID,
  p_type       TEXT,
  p_selections JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slip_id UUID;
  v_sel     JSONB;
BEGIN
  -- Vérifier que l'utilisateur n'a pas déjà parié sur ces polls dans un autre bulletin pending
  FOR v_sel IN SELECT * FROM jsonb_array_elements(p_selections) LOOP
    IF EXISTS (
      SELECT 1
      FROM public.bet_slip_selections bss
      JOIN public.bet_slips bs ON bs.id = bss.slip_id
      WHERE bs.user_id   = p_user_id
        AND bs.status    = 'pending'
        AND bss.poll_id  = (v_sel->>'poll_id')::UUID
    ) THEN
      RAISE EXCEPTION 'duplicate_poll: Poll % already in a pending slip', v_sel->>'poll_id';
    END IF;
  END LOOP;

  -- Créer le bulletin
  INSERT INTO public.bet_slips (user_id, season_id, type)
  VALUES (p_user_id, p_season_id, p_type::bet_slip_type)
  RETURNING id INTO v_slip_id;

  -- Insérer les sélections
  FOR v_sel IN SELECT * FROM jsonb_array_elements(p_selections) LOOP
    INSERT INTO public.bet_slip_selections (slip_id, poll_id, option_index)
    VALUES (
      v_slip_id,
      (v_sel->>'poll_id')::UUID,
      (v_sel->>'option_index')::INT
    );
  END LOOP;

  RETURN v_slip_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_bet_slip TO authenticated;

-- ── Fonction : résoudre les bulletins liés à un poll résolu ──────────────────
-- Appelée par resolve_match_polls après chaque poll mis à jour

CREATE OR REPLACE FUNCTION public.resolve_bet_slips_for_poll(
  p_poll_id         UUID,
  p_correct_idx     INT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sel    RECORD;
BEGIN
  -- Mettre à jour is_correct sur chaque sélection concernée
  UPDATE public.bet_slip_selections
  SET is_correct = (option_index = p_correct_idx)
  WHERE poll_id = p_poll_id;

  -- Pour chaque bulletin qui contient ce poll, tenter la résolution complète
  FOR v_sel IN
    SELECT DISTINCT slip_id
    FROM public.bet_slip_selections
    WHERE poll_id = p_poll_id
  LOOP
    PERFORM public.try_resolve_slip(v_sel.slip_id);
  END LOOP;
END;
$$;

-- ── Fonction : tenter de résoudre un bulletin quand tous ses polls sont résolus

CREATE OR REPLACE FUNCTION public.try_resolve_slip(p_slip_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slip        RECORD;
  v_total       INT;
  v_resolved    INT;
  v_correct     INT;
  v_points      INT := 0;
BEGIN
  SELECT * INTO v_slip FROM public.bet_slips WHERE id = p_slip_id;
  IF NOT FOUND OR v_slip.status != 'pending' THEN RETURN; END IF;

  SELECT
    COUNT(*)                              INTO v_total
  FROM public.bet_slip_selections WHERE slip_id = p_slip_id;

  SELECT
    COUNT(*) FILTER (WHERE is_correct IS NOT NULL) INTO v_resolved
  FROM public.bet_slip_selections WHERE slip_id = p_slip_id;

  -- Pas encore tous résolus
  IF v_resolved < v_total THEN RETURN; END IF;

  SELECT
    COUNT(*) FILTER (WHERE is_correct = true) INTO v_correct
  FROM public.bet_slip_selections WHERE slip_id = p_slip_id;

  -- Calcul des points
  IF v_slip.type = 'simple' THEN
    -- Simple : 3 pts par sélection correcte
    v_points := v_correct * 3;
    UPDATE public.bet_slips
    SET status        = CASE WHEN v_correct > 0 THEN 'won' ELSE 'lost' END,
        points_earned = v_points,
        resolved_at   = NOW()
    WHERE id = p_slip_id;

  ELSIF v_slip.type = 'combo' THEN
    -- Combiné : toutes correctes → 3 * nombre de sélections, sinon 0
    IF v_correct = v_total THEN
      v_points := v_total * 3;
      UPDATE public.bet_slips
      SET status = 'won', points_earned = v_points, resolved_at = NOW()
      WHERE id = p_slip_id;
    ELSE
      UPDATE public.bet_slips
      SET status = 'lost', points_earned = 0, resolved_at = NOW()
      WHERE id = p_slip_id;
    END IF;
  END IF;
END;
$$;

-- ── Intégrer dans resolve_match_polls ─────────────────────────────────────────
-- On étend la fonction existante pour appeler resolve_bet_slips_for_poll
-- après chaque résolution de poll.

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
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id;
  IF NOT FOUND THEN RETURN; END IF;

  v_home_score := COALESCE(v_match.home_score, 0);
  v_away_score := COALESCE(v_match.away_score, 0);

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

  FOR v_poll IN
    SELECT * FROM public.polls
    WHERE match_id = p_match_id
      AND status IN ('active', 'closed')
      AND poll_type != 'custom'
  LOOP
    v_correct_idx := NULL;

    CASE v_poll.poll_type
      WHEN 'winner' THEN
        IF    v_home_score > v_away_score THEN v_correct_idx := 0;
        ELSIF v_home_score = v_away_score THEN v_correct_idx := 1;
        ELSE                                   v_correct_idx := 2;
        END IF;
      WHEN 'btts' THEN
        v_correct_idx := CASE WHEN v_btts THEN 0 ELSE 1 END;
      WHEN 'total_goals' THEN
        v_correct_idx := CASE WHEN (v_home_score+v_away_score)<=1 THEN 0 WHEN (v_home_score+v_away_score)<=3 THEN 1 ELSE 2 END;
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
      ELSE v_correct_idx := NULL;
    END CASE;

    UPDATE public.polls
    SET status = 'completed', correct_option_index = v_correct_idx
    WHERE id = v_poll.id;

    IF v_correct_idx IS NOT NULL THEN
      -- Résolution des predictions classiques
      UPDATE public.predictions
      SET is_correct    = (option_index = v_correct_idx),
          points_earned = CASE WHEN option_index = v_correct_idx THEN 3 ELSE 0 END
      WHERE poll_id = v_poll.id;

      -- ← NOUVEAU : résolution des bulletins
      PERFORM public.resolve_bet_slips_for_poll(v_poll.id, v_correct_idx);
    END IF;
  END LOOP;

  UPDATE public.polls
  SET status = 'completed'
  WHERE match_id = p_match_id
    AND status IN ('active', 'closed')
    AND poll_type = 'custom';
END;
$$;

-- ── Vue : historique des bulletins avec leurs sélections ──────────────────────
CREATE OR REPLACE VIEW public.bet_slips_history AS
SELECT
  bs.id,
  bs.user_id,
  bs.season_id,
  bs.type,
  bs.status,
  bs.points_earned,
  bs.created_at,
  bs.resolved_at,
  jsonb_agg(
    jsonb_build_object(
      'selection_id',  bss.id,
      'poll_id',       bss.poll_id,
      'question',      p.question,
      'options',       p.options,
      'option_index',  bss.option_index,
      'is_correct',    bss.is_correct,
      'poll_status',   p.status,
      'correct_option_index', p.correct_option_index
    ) ORDER BY bss.created_at
  ) AS selections
FROM public.bet_slips bs
JOIN public.bet_slip_selections bss ON bss.slip_id = bs.id
JOIN public.polls p ON p.id = bss.poll_id
GROUP BY bs.id;

GRANT SELECT ON public.bet_slips_history TO authenticated;
