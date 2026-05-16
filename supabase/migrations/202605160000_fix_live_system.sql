-- Refonte du système de gestion des matchs live
-- Atomicité, synchronisation du score et support des pauses

-- 1. Ajout des colonnes pour le système de pause et de liaison
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_paused_seconds INTEGER DEFAULT 0;

ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS match_event_id UUID;

-- 2. Fonction RPC pour basculer la pause
CREATE OR REPLACE FUNCTION public.toggle_match_pause(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_now TIMESTAMPTZ := now();
    v_is_paused BOOLEAN;
    v_paused_at TIMESTAMPTZ;
    v_total_paused_seconds INTEGER;
    v_match_status TEXT;
    v_live_started_at TIMESTAMPTZ;
    v_live_period INTEGER;
    v_user_role TEXT;
    v_minute INTEGER;
BEGIN
    -- Vérification admin
    v_user_role := (SELECT role FROM public.profiles WHERE id = auth.uid());
    IF v_user_role != 'admin' THEN
        RAISE EXCEPTION 'Accès refusé: rôle admin requis';
    END IF;

    SELECT is_paused, paused_at, total_paused_seconds, status, live_started_at, live_period
    INTO v_is_paused, v_paused_at, v_total_paused_seconds, v_match_status, v_live_started_at, v_live_period
    FROM public.matches WHERE id = p_match_id;

    IF v_match_status != 'live' THEN
        RAISE EXCEPTION 'Impossible de mettre en pause un match qui n''est pas en direct';
    END IF;

    -- Calcul de la minute actuelle pour l'événement
    IF v_live_started_at IS NOT NULL THEN
        v_minute := (EXTRACT(EPOCH FROM (v_now - v_live_started_at))::INTEGER - v_total_paused_seconds) / 60;
        IF v_minute < 0 THEN v_minute := 0; END IF;
    ELSE
        v_minute := 0;
    END IF;

    IF v_is_paused THEN
        -- Reprise : on calcule la durée de la pause écoulée
        v_total_paused_seconds := v_total_paused_seconds + EXTRACT(EPOCH FROM (v_now - v_paused_at))::INTEGER;
        
        UPDATE public.matches 
        SET is_paused = false,
            paused_at = NULL,
            total_paused_seconds = v_total_paused_seconds,
            updated_at = v_now
        WHERE id = p_match_id;

        -- Événement de reprise
        INSERT INTO public.match_events (match_id, type, minute, period, description)
        VALUES (p_match_id, 'resume', v_minute, COALESCE(v_live_period, 1), 'Reprise du jeu');
    ELSE
        -- Mise en pause
        UPDATE public.matches 
        SET is_paused = true,
            paused_at = v_now,
            updated_at = v_now
        WHERE id = p_match_id;

        -- Événement de pause
        INSERT INTO public.match_events (match_id, type, minute, period, description)
        VALUES (p_match_id, 'pause', v_minute, COALESCE(v_live_period, 1), 'Match suspendu par l''arbitre');
    END IF;

    RETURN jsonb_build_object('success', true, 'is_paused', NOT v_is_paused);
END;
$$;

-- 3. Fonction RPC sécurisée pour ajouter un événement (Atomicité Score)
CREATE OR REPLACE FUNCTION public.add_match_event_v2(
    p_match_id UUID,
    p_type TEXT,
    p_minute INTEGER,
    p_period INTEGER,
    p_team_id UUID DEFAULT NULL,
    p_player_id UUID DEFAULT NULL,
    p_player2_id UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event_id UUID;
    v_user_id UUID := auth.uid();
    v_user_role TEXT;
BEGIN
    -- Vérification admin
    v_user_role := (SELECT role FROM public.profiles WHERE id = v_user_id);
    IF v_user_role != 'admin' THEN
        RAISE EXCEPTION 'Accès refusé: rôle admin requis';
    END IF;

    -- 1. Insérer l'événement
    INSERT INTO public.match_events (
        match_id, type, minute, period, team_id, player_id, player2_id, description, created_by
    ) VALUES (
        p_match_id, p_type, p_minute, p_period, p_team_id, p_player_id, p_player2_id, p_description, v_user_id
    ) RETURNING id INTO v_event_id;

    -- 2. Logique spécifique aux buts
    IF p_type IN ('goal', 'own_goal') THEN
        -- Ajouter dans la table goals
        INSERT INTO public.goals (match_id, team_id, player_id, minute, is_own_goal, match_event_id)
        VALUES (p_match_id, p_team_id, p_player_id, p_minute, (p_type = 'own_goal'), v_event_id);

        -- Ajouter le passeur si présent
        IF p_player2_id IS NOT NULL AND p_type = 'goal' THEN
            INSERT INTO public.assists (match_id, goal_id, player_id)
            SELECT p_match_id, g.id, p_player2_id
            FROM public.goals g WHERE g.match_event_id = v_event_id;
        END IF;

        -- 3. Mise à jour atomique du score dans matches
        IF p_type = 'goal' THEN
            -- But classique pour l'équipe p_team_id
            UPDATE public.matches 
            SET home_score = CASE WHEN home_team_id = p_team_id THEN COALESCE(home_score, 0) + 1 ELSE home_score END,
                away_score = CASE WHEN away_team_id = p_team_id THEN COALESCE(away_score, 0) + 1 ELSE away_score END
            WHERE id = p_match_id;
        ELSIF p_type = 'own_goal' THEN
            -- CSC : l'autre équipe marque
            UPDATE public.matches 
            SET home_score = CASE WHEN home_team_id != p_team_id THEN COALESCE(home_score, 0) + 1 ELSE home_score END,
                away_score = CASE WHEN away_team_id != p_team_id THEN COALESCE(away_score, 0) + 1 ELSE away_score END
            WHERE id = p_match_id;
        END IF;
    END IF;

    RETURN jsonb_build_object('success', true, 'event_id', v_event_id);
END;
$$;

-- 4. Fonction RPC sécurisée pour supprimer un événement (Atomicité Reversion)
CREATE OR REPLACE FUNCTION public.delete_match_event_v2(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_match_id UUID;
    v_type TEXT;
    v_team_id UUID;
    v_user_role TEXT;
BEGIN
    -- Vérification admin
    v_user_role := (SELECT role FROM public.profiles WHERE id = auth.uid());
    IF v_user_role != 'admin' THEN
        RAISE EXCEPTION 'Accès refusé: rôle admin requis';
    END IF;

    SELECT match_id, type, team_id INTO v_match_id, v_type, v_team_id
    FROM public.match_events WHERE id = p_event_id;

    -- Si c'est un but, on décrémente le score AVANT de supprimer (cascade gérera goals/assists)
    IF v_type IN ('goal', 'own_goal') THEN
        IF v_type = 'goal' THEN
            UPDATE public.matches 
            SET home_score = CASE WHEN home_team_id = v_team_id THEN GREATEST(0, COALESCE(home_score, 0) - 1) ELSE home_score END,
                away_score = CASE WHEN away_team_id = v_team_id THEN GREATEST(0, COALESCE(away_score, 0) - 1) ELSE away_score END
            WHERE id = v_match_id;
        ELSE -- own_goal
            UPDATE public.matches 
            SET home_score = CASE WHEN home_team_id != v_team_id THEN GREATEST(0, COALESCE(home_score, 0) - 1) ELSE home_score END,
                away_score = CASE WHEN away_team_id != v_team_id THEN GREATEST(0, COALESCE(away_score, 0) - 1) ELSE away_score END
            WHERE id = v_match_id;
        END IF;
    END IF;

    -- Suppression de l'événement (ON DELETE CASCADE s'occupe des tables filles)
    DELETE FROM public.match_events WHERE id = p_event_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 5. S'assurer que les clés étrangères sont prêtes pour le CASCADE
-- (Note: cela peut nécessiter de supprimer/recréer les contraintes si elles existent déjà sans cascade)
ALTER TABLE public.goals 
DROP CONSTRAINT IF EXISTS goals_match_event_id_fkey,
ADD CONSTRAINT goals_match_event_id_fkey 
FOREIGN KEY (match_event_id) REFERENCES public.match_events(id) ON DELETE CASCADE;

ALTER TABLE public.assists 
DROP CONSTRAINT IF EXISTS assists_goal_id_fkey,
ADD CONSTRAINT assists_goal_id_fkey 
FOREIGN KEY (goal_id) REFERENCES public.goals(id) ON DELETE CASCADE;
