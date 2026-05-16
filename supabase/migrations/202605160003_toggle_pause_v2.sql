-- Crée toggle_match_pause_v2 avec support du paramètre raison
-- (la v1 toggle_match_pause existe déjà, on ajoute la v2 sans la supprimer)

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
    v_diff_seconds         INTEGER;
    v_user_role            TEXT;
BEGIN
    -- Vérification admin
    v_user_role := (SELECT role FROM public.profiles WHERE id = auth.uid());
    IF v_user_role != 'admin' THEN
        RAISE EXCEPTION 'Accès refusé: rôle admin requis';
    END IF;

    SELECT is_paused, paused_at, total_paused_seconds, status, live_period
    INTO   v_is_paused, v_paused_at, v_total_paused_seconds, v_match_status, v_live_period
    FROM   public.matches
    WHERE  id = p_match_id;

    IF v_match_status != 'live' THEN
        RAISE EXCEPTION 'Le match n''est pas en direct';
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
        VALUES (p_match_id, 'resume', 0, COALESCE(v_live_period, 1), auth.uid(), 'Reprise du jeu');
    ELSE
        -- METTRE EN PAUSE
        UPDATE public.matches
        SET is_paused         = true,
            paused_at         = v_now,
            last_pause_reason = p_reason,
            updated_at        = v_now
        WHERE id = p_match_id;

        INSERT INTO public.match_events (match_id, type, minute, period, created_by, description)
        VALUES (p_match_id, 'pause', 0, COALESCE(v_live_period, 1), auth.uid(),
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
