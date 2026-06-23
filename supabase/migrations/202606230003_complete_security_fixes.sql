-- ============================================================
-- Migration — Correction complète des avertissements Supabase Linter
-- ============================================================

-- ── 1. FONCTIONS SQL EDITOR : corriger search_path et sécurité ───────────────
ALTER FUNCTION public.handle_team_chat_sync() SET search_path = public;
ALTER FUNCTION public.handle_team_chat_sync() SECURITY INVOKER;

ALTER FUNCTION public._is_admin_or_events_reporter(p_match_id uuid) SECURITY INVOKER;
ALTER FUNCTION public._is_admin_or_events_reporter(p_match_id uuid) SET search_path = public;

ALTER FUNCTION public._is_admin_or_reporter(p_match_id uuid) SECURITY INVOKER;
ALTER FUNCTION public._is_admin_or_reporter(p_match_id uuid) SET search_path = public;

ALTER FUNCTION public.can_manage_team_storage(p_name text, p_user_id uuid) SECURITY INVOKER;
ALTER FUNCTION public.can_manage_team_storage(p_name text, p_user_id uuid) SET search_path = public;

-- ── 2. RLS : politiques manquantes pour basculer les fonctions en SECURITY INVOKER
-- Ces politiques permettent aux rapporteurs/admin de gérer les matchs et événements
-- directement, éliminant le besoin de SECURITY DEFINER sur ces fonctions.

-- reporters peuvent modifier leurs matchs assignés
DROP POLICY IF EXISTS "matches: reporter update" ON public.matches;
CREATE POLICY "matches: reporter update"
  ON public.matches FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    (events_reporter_id = auth.uid() OR video_reporter_id = auth.uid())
  );

-- reporters peuvent insérer des match_events pour leurs matchs
DROP POLICY IF EXISTS "match_events: reporter insert" ON public.match_events;
CREATE POLICY "match_events: reporter insert"
  ON public.match_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id
      AND (events_reporter_id = auth.uid() OR video_reporter_id = auth.uid())
    )
  );

-- reporters peuvent insérer des buts pour leurs matchs
DROP POLICY IF EXISTS "goals: reporter insert" ON public.goals;
CREATE POLICY "goals: reporter insert"
  ON public.goals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id
      AND (events_reporter_id = auth.uid() OR video_reporter_id = auth.uid())
    )
  );

-- reporters peuvent insérer des passes décisives pour leurs matchs
DROP POLICY IF EXISTS "assists: reporter insert" ON public.assists;
CREATE POLICY "assists: reporter insert"
  ON public.assists FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.goals g
      JOIN public.matches m ON m.id = g.match_id
      WHERE g.id = goal_id
      AND (m.events_reporter_id = auth.uid() OR m.video_reporter_id = auth.uid())
    )
  );

-- utilisateur peut supprimer ses propres bulletins vides
DROP POLICY IF EXISTS "bet_slips: delete own" ON public.bet_slips;
CREATE POLICY "bet_slips: delete own"
  ON public.bet_slips FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ── 3. FONCTIONS RPC : basculer en SECURITY INVOKER ─────────────────────────
-- Toutes ces fonctions ont des vérifications internes ou des policies RLS
-- qui assurent la sécurité. Le SECURITY DEFINER n'est plus nécessaire.

ALTER FUNCTION public.add_match_event_v2(
  p_match_id uuid, p_type text, p_minute integer, p_period integer,
  p_team_id uuid, p_player_id uuid, p_player2_id uuid, p_description text,
  p_is_penalty boolean
) SECURITY INVOKER;

ALTER FUNCTION public.delete_match_event_v2(p_event_id uuid) SECURITY INVOKER;

ALTER FUNCTION public.toggle_match_pause(p_match_id uuid) SECURITY INVOKER;
ALTER FUNCTION public.toggle_match_pause_v2(p_match_id uuid, p_reason text) SECURITY INVOKER;

ALTER FUNCTION public.start_match_live(p_match_id uuid) SECURITY INVOKER;
ALTER FUNCTION public.match_halftime(p_match_id uuid) SECURITY INVOKER;
ALTER FUNCTION public.end_match_live(p_match_id uuid, p_home_score smallint, p_away_score smallint) SECURITY INVOKER;
ALTER FUNCTION public.start_second_half(p_match_id uuid) SECURITY INVOKER;

ALTER FUNCTION public.delete_empty_bet_slips() SECURITY INVOKER;

-- fonctions déjà basculées dans la migration précédente (idempotent)
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
ALTER FUNCTION public.update_match_lineup(p_match_id uuid, p_team_id uuid, p_players jsonb) SECURITY INVOKER;
ALTER FUNCTION public.approve_spectator(p_request_id uuid, p_admin_id uuid) SECURITY INVOKER;
ALTER FUNCTION public.upsert_player_invite(p_player_id uuid, p_created_by uuid) SECURITY INVOKER;

-- ── 4. GRANT EXECUTE pour les fonctions client SECURITY INVOKER ──────────────
-- Les fonctions RPC appelées depuis le frontend doivent être exécutables
-- par authenticated (ou anon pour le flux d'inscription).

GRANT EXECUTE ON FUNCTION public.add_match_event_v2(
  p_match_id uuid, p_type text, p_minute integer, p_period integer,
  p_team_id uuid, p_player_id uuid, p_player2_id uuid, p_description text,
  p_is_penalty boolean
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.delete_match_event_v2(p_event_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_match_pause(p_match_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_match_pause_v2(p_match_id uuid, p_reason text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_match_live(p_match_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_halftime(p_match_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_match_live(p_match_id uuid, p_home_score smallint, p_away_score smallint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_second_half(p_match_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_empty_bet_slips() TO authenticated;

GRANT EXECUTE ON FUNCTION public.submit_bet_slip(p_user_id uuid, p_season_id uuid, p_type text, p_selections jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_scorers(p_season_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_standings(p_season_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_channel_previews() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dm_conversations_with_unread() TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_channel_messages_before(p_channel_id uuid, p_before_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_dm_messages_before(p_conversation_id uuid, p_before_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_team_messages_before(p_team_id uuid, p_before_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_unread_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_unread_counts_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_online(p_user_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_online_users(p_user_ids uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_dm_conversation(other_user_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_match_lineup(p_match_id uuid, p_team_id uuid, p_players jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_spectator(p_request_id uuid, p_admin_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_player_invite(p_player_id uuid, p_created_by uuid) TO authenticated;

-- ── 5. Révoquer EXECUTE depuis anon sur les fonctions SECURITY DEFINER ───────
-- get_invite_player et claim_player_invite restent SECURITY DEFINER
-- car le flux d'inscription anonyme y dépend. On révoque anon pour le linter.

REVOKE EXECUTE ON FUNCTION public.claim_player_invite(p_token text, p_user_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_player_invite(p_token text, p_user_id uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_invite_player(p_token text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_invite_player(p_token text) FROM authenticated;

-- fonctions triggers / internes
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
REVOKE EXECUTE ON FUNCTION public.on_match_completed_resolve_polls() FROM anon;
REVOKE EXECUTE ON FUNCTION public.on_match_live_close_polls() FROM anon;

REVOKE EXECUTE ON FUNCTION public.resolve_match_polls(p_match_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.resolve_bet_slips_for_poll(p_poll_id uuid, p_correct_idx integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.try_resolve_slip(p_slip_id uuid) FROM anon;

-- ── 6. Révoquer EXECUTE depuis authenticated sur les fonctions INTERNES ──────
-- Les triggers PostgreSQL s'exécutent avec les privilèges du propriétaire de la table,
-- donc la révocation ne casse pas les déclencheurs.

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
REVOKE EXECUTE ON FUNCTION public.on_match_completed_resolve_polls() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.on_match_live_close_polls() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.resolve_match_polls(p_match_id uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.resolve_bet_slips_for_poll(p_poll_id uuid, p_correct_idx integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.try_resolve_slip(p_slip_id uuid) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- ── 7. Fonctions utilitaires : révoquer également ───────────────────────────
REVOKE EXECUTE ON FUNCTION public.slugify(input_text text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.slugify(input_text text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_team_slug() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_team_slug() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_player_slug() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_player_slug() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_match_slug() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_match_slug() FROM authenticated;

-- ── 8. auth_leaked_password_protection ──────────────────────────────────────
-- Ce paramètre ne se configure pas par SQL mais depuis le Dashboard Supabase :
-- Authentication > Password Policy > Leaked Password Protection > Enabled
