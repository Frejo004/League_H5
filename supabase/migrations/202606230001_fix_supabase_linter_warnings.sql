-- ============================================================
-- Migration — Correction de tous les avertissements Supabase Linter
-- ============================================================

-- ── 1. EXTENSION: Déplacer unaccent vers le schema extensions ─────────────
CREATE SCHEMA IF NOT EXISTS extensions;
DROP EXTENSION IF EXISTS unaccent CASCADE;
CREATE EXTENSION unaccent WITH SCHEMA extensions;

-- ── 2. FONCTIONS: Corriger search_path (function_search_path_mutable) ─────
-- Toutes les fonctions sans SET search_path le font avec SET search_path = public

-- slugify (utilise unaccent qui est maintenant dans extensions)
CREATE OR REPLACE FUNCTION public.slugify(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN regexp_replace(
    regexp_replace(
      regexp_replace(
        lower(extensions.unaccent(trim(input_text))),
        '[\s_]+', '-', 'g'
      ),
      '[^a-z0-9-]+', '', 'g'
    ),
    '-+', '-', 'g'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- generate_team_slug
CREATE OR REPLACE FUNCTION public.generate_team_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 1;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug != '' THEN
    NEW.slug := public.slugify(NEW.slug);
    RETURN NEW;
  END IF;
  base_slug := public.slugify(NEW.name);
  final_slug := base_slug;
  WHILE EXISTS (
    SELECT 1 FROM public.teams
    WHERE slug = final_slug
    AND season_id = NEW.season_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')
  ) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  NEW.slug := final_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- generate_player_slug
CREATE OR REPLACE FUNCTION public.generate_player_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 1;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug != '' THEN
    NEW.slug := public.slugify(NEW.slug);
    RETURN NEW;
  END IF;
  base_slug := public.slugify(NEW.first_name || '-' || NEW.last_name);
  final_slug := base_slug;
  WHILE EXISTS (
    SELECT 1 FROM public.players
    WHERE slug = final_slug
    AND season_id = NEW.season_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')
  ) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  NEW.slug := final_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- generate_match_slug
CREATE OR REPLACE FUNCTION public.generate_match_slug()
RETURNS TRIGGER AS $$
DECLARE
  home_team_name TEXT;
  away_team_name TEXT;
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 1;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug != '' THEN
    NEW.slug := public.slugify(NEW.slug);
    RETURN NEW;
  END IF;
  SELECT name INTO home_team_name FROM public.teams WHERE id = NEW.home_team_id;
  SELECT name INTO away_team_name FROM public.teams WHERE id = NEW.away_team_id;
  base_slug := public.slugify(home_team_name || '-vs-' || away_team_name || '-j' || NEW.matchday);
  final_slug := base_slug;
  WHILE EXISTS (
    SELECT 1 FROM public.matches
    WHERE slug = final_slug
    AND season_id = NEW.season_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')
  ) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  NEW.slug := final_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- set_match_feedback_updated_at
CREATE OR REPLACE FUNCTION public.set_match_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- check_player_season_matches_team
CREATE OR REPLACE FUNCTION public.check_player_season_matches_team()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (SELECT season_id FROM public.teams WHERE id = NEW.team_id) <> NEW.season_id THEN
    RAISE EXCEPTION 'players.season_id must match teams.season_id';
  END IF;
  RETURN NEW;
END;
$$;

-- set_presence_last_seen
CREATE OR REPLACE FUNCTION public.set_presence_last_seen()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.last_seen := NOW();
  RETURN NEW;
END;
$$;

-- can_manage_team_storage
CREATE OR REPLACE FUNCTION public.can_manage_team_storage(p_name text, p_user_id uuid)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_team_id_text text;
BEGIN
  v_team_id_text := split_part(p_name, '/', 2);
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id AND role = 'admin') THEN
    RETURN TRUE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id::text = v_team_id_text
    AND (
      t.captain_id = p_user_id
      OR EXISTS (
        SELECT 1 FROM public.players p
        WHERE p.id = t.captain_player_id
        AND p.user_id = p_user_id
      )
    )
  );
END;
$$;

-- set_news_posts_updated_at
CREATE OR REPLACE FUNCTION public.set_news_posts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- set_updated_at (trigger générique)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- handle_red_card_suspension
CREATE OR REPLACE FUNCTION public.handle_red_card_suspension()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_season_id UUID;
BEGIN
    IF NEW.type = 'red_card' THEN
        SELECT season_id INTO v_season_id FROM public.matches WHERE id = NEW.match_id;
        INSERT INTO public.suspensions (player_id, season_id, match_id_trigger, reason, matches_count)
        VALUES (NEW.player_id, v_season_id, NEW.match_id, 'Carton Rouge Direct', 1);
    END IF;
    RETURN NEW;
END;
$$;

-- resolve_match_polls (version la plus récente, reste SECURITY DEFINER
-- car elle met à jour toutes les prédictions d'un poll sans restriction RLS)
CREATE OR REPLACE FUNCTION public.resolve_match_polls(p_match_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  SELECT COUNT(*) INTO v_corners_total FROM public.match_events WHERE match_id = p_match_id AND type = 'corner';
  SELECT COUNT(*) INTO v_fouls_total FROM public.match_events WHERE match_id = p_match_id AND type = 'foul';

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
      ELSE v_correct_idx := NULL;
    END CASE;

    UPDATE public.polls
    SET status = 'completed', correct_option_index = v_correct_idx
    WHERE id = v_poll.id;

    IF v_correct_idx IS NOT NULL THEN
      UPDATE public.predictions
      SET is_correct = (option_index = v_correct_idx),
          points_earned = CASE WHEN option_index = v_correct_idx THEN 3 ELSE 0 END
      WHERE poll_id = v_poll.id;
    END IF;
  END LOOP;

  UPDATE public.polls
  SET status = 'completed'
  WHERE match_id = p_match_id
    AND status IN ('active', 'closed')
    AND poll_type = 'custom';
END;
$$;

-- on_match_completed_resolve_polls
CREATE OR REPLACE FUNCTION public.on_match_completed_resolve_polls()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
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

-- on_match_live_close_polls
CREATE OR REPLACE FUNCTION public.on_match_live_close_polls()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'live' AND OLD.status IS DISTINCT FROM 'live' THEN
    UPDATE public.polls SET status = 'closed'
    WHERE match_id = NEW.id AND status = 'active';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS match_live_close_polls ON public.matches;
CREATE TRIGGER match_live_close_polls
  AFTER UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.on_match_live_close_polls();

-- ── 3. SECURITY DEFINER → SECURITY INVOKER ─────────────────────────────────
-- Ces fonctions ont des vérifications internes (auth.uid()) et fonctionnent
-- correctement en SECURITY INVOKER. Cela supprime les avertissements
-- anon/authenticated_security_definer_function_executable.

-- Fonctions RPC définies dans les migrations
-- toggle_match_pause et toggle_match_pause_v2 modifient matches (pas match_events)
-- donc pas de problème de trigger. SECURITY INVOKER est possible.
-- add_match_event_v2, start_match_live, match_halftime, end_match_live, start_second_half
-- restent SECURITY DEFINER car leur INSERT dans match_events déclenche le trigger
-- handle_red_card_suspension qui écrit dans suspensions (les reporters n'ont pas
-- ce droit en SECURITY INVOKER).
-- On révoque seulement anon pour ces fonctions.
-- resolve_match_polls, resolve_bet_slips_for_poll, try_resolve_slip, delete_empty_bet_slips
-- restent SECURITY DEFINER car ils mettent à jour TOUTES les lignes d'une table
-- (toutes les predictions d'un poll, toutes les selections d'un slip, etc.),
-- ce qui est bloqué par les policies RLS "own" en SECURITY INVOKER.
-- On révoque seulement anon.
ALTER FUNCTION public.submit_bet_slip(p_user_id uuid, p_season_id uuid, p_type text, p_selections jsonb) SECURITY INVOKER;
ALTER FUNCTION public.check_transfer_limits() SECURITY INVOKER;
ALTER FUNCTION public.set_active_season(p_season_id uuid) SECURITY INVOKER;
ALTER FUNCTION public.set_team_captain(p_team_id uuid, p_captain_player_id uuid, p_captain_user_id uuid) SECURITY INVOKER;
ALTER FUNCTION public.get_scorers(p_season_id uuid) SECURITY INVOKER;
ALTER FUNCTION public.get_standings(p_season_id uuid) SECURITY INVOKER;
ALTER FUNCTION public.get_channel_previews() SECURITY INVOKER;
ALTER FUNCTION public.get_dm_conversations_with_unread() SECURITY INVOKER;
ALTER FUNCTION public.count_channel_messages_before(p_channel_id uuid, p_before_id uuid) SECURITY INVOKER;
ALTER FUNCTION public.count_dm_messages_before(p_conversation_id uuid, p_before_id uuid) SECURITY INVOKER;
ALTER FUNCTION public.count_team_messages_before(p_team_id uuid, p_before_id uuid) SECURITY INVOKER;
ALTER FUNCTION public.get_team_unread_counts() SECURITY INVOKER;
ALTER FUNCTION public.get_team_unread_counts_admin() SECURITY INVOKER;
ALTER FUNCTION public.is_user_online(p_user_id uuid) SECURITY INVOKER;
ALTER FUNCTION public.get_online_users(p_user_ids uuid[]) SECURITY INVOKER;
ALTER FUNCTION public.get_or_create_dm_conversation(other_user_id uuid) SECURITY INVOKER;

-- Fonctions RPC définies dans src/ (fichiers SQL locaux)
ALTER FUNCTION public.update_match_lineup(p_match_id uuid, p_team_id uuid, p_players jsonb) SECURITY INVOKER;
ALTER FUNCTION public.approve_spectator(p_request_id uuid, p_admin_id uuid) SECURITY INVOKER;
ALTER FUNCTION public.upsert_player_invite(p_player_id uuid, p_created_by uuid) SECURITY INVOKER;

-- Fonctions triggers internes (garder SECURITY DEFINER mais révoquer anon)
-- set_updated_at, handle_new_user, handle_new_season, etc.
-- Ces fonctions ne sont pas appelées via REST API, on révoque l'exécution.

-- ── 4. Révoquer EXECUTE depuis le rôle anon pour les fonctions restantes ─────
-- Fonctions SECURITY DEFINER gardées (trigger + helpers internes)
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_season() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_profile_spectator() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_notification_preferences() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_captain_on_claim() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_player_identity_from_profile() FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_player_season_matches_team() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_red_card_suspension() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_match_feedback_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_news_posts_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_presence_last_seen() FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_team_storage(p_name text, p_user_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_player_invite(p_token text, p_user_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.resolve_match_polls(p_match_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.resolve_bet_slips_for_poll(p_poll_id uuid, p_correct_idx integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.try_resolve_slip(p_slip_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_empty_bet_slips() FROM anon;
REVOKE EXECUTE ON FUNCTION public.add_match_event_v2(p_match_id uuid, p_type text, p_minute integer, p_period integer, p_team_id uuid, p_player_id uuid, p_player2_id uuid, p_description text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.start_match_live(p_match_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.match_halftime(p_match_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.end_match_live(p_match_id uuid, p_home_score smallint, p_away_score smallint) FROM anon;
REVOKE EXECUTE ON FUNCTION public.start_second_half(p_match_id uuid) FROM anon;

-- Révoquer aussi depuis authenticated pour les fonctions trigger internes
-- (pas appelées via REST API)
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_season() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_profile_spectator() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_notification_preferences() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_captain_on_claim() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_player_identity_from_profile() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.check_player_season_matches_team() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_red_card_suspension() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.set_match_feedback_updated_at() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.set_news_posts_updated_at() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.set_presence_last_seen() FROM authenticated;

-- handle_new_user reste SECURITY DEFINER (trigger sur auth.users)
-- On révoque seulement depuis anon (authenticated a besoin de ce trigger)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;

-- ── 5. Fix public_bucket_allows_listing ────────────────────────────────────
-- Supprimer les politiques SELECT trop larges sur les buckets publics

-- Bucket avatars: supprimer les politiques SELECT publiques trop larges
DROP POLICY IF EXISTS "avatars: public read" ON storage.objects;
DROP POLICY IF EXISTS "avatars: public select" ON storage.objects;
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;

-- Bucket news-images: supprimer la politique SELECT publique trop large
DROP POLICY IF EXISTS "news-images: public read" ON storage.objects;

-- NOTE: Les buckets publics sont accessibles directement par URL.
-- Les policies DELETE/UPDATE/INSERT existent déjà pour protéger l'écriture.
-- La suppression des policies SELECT publiques empêche le listing sans
-- bloquer l'accès direct aux fichiers (via l'URL publique du bucket).

-- ── 6. Fonctions et tables créées hors migrations (SQL Editor) ──────────────
-- Les fonctions suivantes ont été créées directement dans Supabase SQL Editor
-- et ne sont pas couvertes par cette migration. Elles doivent être corrigées
-- manuellement via l'éditeur SQL de Supabase :

-- handle_team_chat_sync()
--   -> SECURITY INVOKER, SET search_path = public
-- is_admin()
--   -> SECURITY INVOKER, SET search_path = public
-- _is_admin_or_events_reporter(p_match_id uuid)
--   -> SECURITY INVOKER, SET search_path = public
-- _is_admin_or_reporter(p_match_id uuid)
--   -> SECURITY INVOKER, SET search_path = public

-- Pour les corriger, exécuter dans Supabase SQL Editor :
-- CREATE OR REPLACE FUNCTION public.handle_team_chat_sync(...)
-- RETURNS ... LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$ ... $$;
-- (Répéter pour chaque fonction avec son corps actuel)

-- ── 7. Table chat_conversations (créée hors migration) ──────────────────────
-- La politique RLS "chat_conv_insert" avec WITH CHECK (true) sur
-- chat_conversations doit être corrigée manuellement.
-- Exécuter dans Supabase SQL Editor :
-- DROP POLICY IF EXISTS "chat_conv_insert" ON public.chat_conversations;
-- CREATE POLICY "chat_conv_insert" ON public.chat_conversations
--   FOR INSERT TO authenticated
--   WITH CHECK (votre_condition_ici);

-- ── 8. auth_leaked_password_protection ─────────────────────────────────────
-- Ce paramètre ne se configure pas par SQL mais depuis le Dashboard Supabase :
-- Authentication > Password Policy > Leaked Password Protection > Enabled
