-- Crée toggle_match_pause_v2 avec support du paramètre raison
-- et calcul de la vraie minute de jeu au moment de la pause/reprise

ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS last_pause_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_match_events_match_id_created 
ON public.match_events(match_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.toggle_match_pause_v2(
  p_match_id UUID,
  p_reason   TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_now                  TIMESTAMPTZ := now();
    v_is_paused            BOOLEAN;
    v_paused_at            TIMESTAMPTZ;
    v_total_paused_seconds INTEGER;
    v_match_status         TEXT;
    v_live_period          INTEGER;
    v_live_started_at      TIMESTAMPTZ;
    v_diff_seconds         INTEGER;
    v_elapsed_seconds      INTEGER;
    v_real_minute          INTEGER;
    v_user_role            TEXT;
BEGIN
    -- Vérification admin
    v_user_role := (SELECT role FROM public.profiles WHERE id = auth.uid());
    IF v_user_role != 'admin' THEN
        RAISE EXCEPTION 'Accès refusé: rôle admin requis';
    END IF;

    SELECT is_paused, paused_at, total_paused_seconds, status, live_period, live_started_at
    INTO   v_is_paused, v_paused_at, v_total_paused_seconds, v_match_status, v_live_period, v_live_started_at
    FROM   public.matches
    WHERE  id = p_match_id;

    IF v_match_status != 'live' THEN
        RAISE EXCEPTION 'Le match n''est pas en direct';
    END IF;

    -- Calcul de la vraie minute de jeu (temps écoulé - pauses cumulées)
    IF v_live_started_at IS NOT NULL THEN
        v_elapsed_seconds := EXTRACT(EPOCH FROM (v_now - v_live_started_at))::INTEGER;
        v_elapsed_seconds := v_elapsed_seconds - COALESCE(v_total_paused_seconds, 0);
        -- Si en cours de pause, on ne compte pas la pause actuelle
        IF v_is_paused AND v_paused_at IS NOT NULL THEN
            v_elapsed_seconds := v_elapsed_seconds - EXTRACT(EPOCH FROM (v_now - v_paused_at))::INTEGER;
        END IF;
        v_real_minute := GREATEST(0, v_elapsed_seconds / 60);
        -- En 2ème MT, la minute affichée commence à 20
        IF v_live_period = 2 THEN
            v_real_minute := 20 + v_real_minute;
        END IF;
    ELSE
        v_real_minute := 0;
    END IF;

    IF v_is_paused THEN
        -- REPRENDRE
        v_diff_seconds := EXTRACT(EPOCH FROM (v_now - v_paused_at))::INTEGER;

        UPDATE public.matches
        SET is_paused            = false,
            paused_at            = NULL,
            total_paused_seconds = COALESCE(v_total_paused_seconds, 0) + v_diff_seconds,
            last_pause_reason    = NULL,
            updated_at           = v_now
        WHERE id = p_match_id;

        INSERT INTO public.match_events (match_id, type, minute, period, created_by, description)
        VALUES (p_match_id, 'resume', v_real_minute, COALESCE(v_live_period, 1), auth.uid(), 'Reprise du jeu');
    ELSE
        -- METTRE EN PAUSE
        UPDATE public.matches
        SET is_paused         = true,
            paused_at         = v_now,
            last_pause_reason = p_reason,
            updated_at        = v_now
        WHERE id = p_match_id;

        INSERT INTO public.match_events (match_id, type, minute, period, created_by, description)
        VALUES (p_match_id, 'pause', v_real_minute, COALESCE(v_live_period, 1), auth.uid(),
                COALESCE(p_reason, 'Match suspendu'));
    END IF;

    RETURN jsonb_build_object(
        'success',   true,
        'is_paused', NOT v_is_paused,
        'reason',    p_reason
    );
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.toggle_match_pause_v2(UUID, TEXT) TO authenticated;
