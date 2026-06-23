-- ============================================================
-- Migration — Ajout du flag is_penalty sur goals et match_events
-- ============================================================

-- 1. Ajouter la colonne sur goals
alter table public.goals add column if not exists is_penalty boolean not null default false;

-- 2. Ajouter la colonne sur match_events pour affichage direct en live
alter table public.match_events add column if not exists is_penalty boolean not null default false;

-- 3. Mettre à jour add_match_event_v2 pour accepter et propager le flag penalty
CREATE OR REPLACE FUNCTION public.add_match_event_v2(
    p_match_id UUID,
    p_type TEXT,
    p_minute INTEGER,
    p_period INTEGER,
    p_team_id UUID DEFAULT NULL,
    p_player_id UUID DEFAULT NULL,
    p_player2_id UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_is_penalty BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event_id UUID;
    v_user_id UUID := auth.uid();
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM profiles WHERE id = v_user_id AND role = 'admin'
        OR
        EXISTS (
            SELECT 1 FROM matches 
            WHERE id = p_match_id 
            AND events_reporter_id = v_user_id
            AND (finished_at IS NULL OR finished_at > now() - interval '10 minutes')
        )
    ) THEN
        RAISE EXCEPTION 'Accès refusé: rôle admin ou rapporteur d''événements requis';
    END IF;

    INSERT INTO public.match_events (
        match_id, type, minute, period, team_id, player_id, player2_id, description, created_by, is_penalty
    ) VALUES (
        p_match_id, p_type, p_minute, p_period, p_team_id, p_player_id, p_player2_id, p_description, v_user_id, p_is_penalty
    ) RETURNING id INTO v_event_id;

    IF p_type IN ('goal', 'own_goal') THEN
        INSERT INTO public.goals (match_id, team_id, player_id, minute, is_own_goal, is_penalty, match_event_id)
        VALUES (p_match_id, p_team_id, p_player_id, p_minute, (p_type = 'own_goal'), p_is_penalty, v_event_id);

        IF p_player2_id IS NOT NULL AND p_type = 'goal' THEN
            INSERT INTO public.assists (match_id, goal_id, player_id)
            SELECT p_match_id, g.id, p_player2_id
            FROM public.goals g WHERE g.match_event_id = v_event_id;
        END IF;

        IF p_type = 'goal' THEN
            UPDATE public.matches 
            SET home_score = CASE WHEN home_team_id = p_team_id THEN COALESCE(home_score, 0) + 1 ELSE home_score END,
                away_score = CASE WHEN away_team_id = p_team_id THEN COALESCE(away_score, 0) + 1 ELSE away_score END
            WHERE id = p_match_id;
        ELSIF p_type = 'own_goal' THEN
            UPDATE public.matches 
            SET home_score = CASE WHEN home_team_id != p_team_id THEN COALESCE(home_score, 0) + 1 ELSE home_score END,
                away_score = CASE WHEN away_team_id != p_team_id THEN COALESCE(away_score, 0) + 1 ELSE away_score END
            WHERE id = p_match_id;
        END IF;
    END IF;

    RETURN jsonb_build_object('success', true, 'event_id', v_event_id);
END;
$$;
