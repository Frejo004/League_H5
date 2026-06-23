-- ============================================================
-- Fix SECURITY DEFINER function permissions and performance issues
-- ============================================================

-- Use FULL FUNCTION SIGNATURES from the linter warnings!
-- Revoke EXECUTE from anon for all security definer functions except the invite-related ones
REVOKE EXECUTE ON FUNCTION public.add_match_event_v2(p_match_id uuid, p_type text, p_minute integer, p_period integer, p_team_id uuid, p_player_id uuid, p_player2_id uuid, p_description text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_conversation_ids() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_profile_spectator() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_season() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_notification_preferences() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_red_card_suspension() FROM anon;
REVOKE EXECUTE ON FUNCTION public.resolve_bet_slips_for_poll(p_poll_id uuid, p_correct_idx integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.resolve_match_polls(p_match_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_captain_on_claim() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_player_identity_from_profile() FROM anon;
REVOKE EXECUTE ON FUNCTION public.try_resolve_slip(p_slip_id uuid) FROM anon;

-- Also revoke from public (Postgres default) for trigger-only functions
REVOKE EXECUTE ON FUNCTION public.handle_new_profile_spectator() FROM public;
REVOKE EXECUTE ON FUNCTION public.handle_new_season() FROM public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_notification_preferences() FROM public;
REVOKE EXECUTE ON FUNCTION public.handle_red_card_suspension() FROM public;
REVOKE EXECUTE ON FUNCTION public.sync_captain_on_claim() FROM public;
REVOKE EXECUTE ON FUNCTION public.sync_player_identity_from_profile() FROM public;

-- Also set proper search_path for all security definer functions (using full signatures!)
ALTER FUNCTION public.add_match_event_v2(p_match_id uuid, p_type text, p_minute integer, p_period integer, p_team_id uuid, p_player_id uuid, p_player2_id uuid, p_description text) SET search_path = public;
ALTER FUNCTION public.claim_player_invite(p_token text, p_user_id uuid) SET search_path = public;
ALTER FUNCTION public.get_invite_player(p_token text) SET search_path = public;
ALTER FUNCTION public.get_user_conversation_ids() SET search_path = public;
ALTER FUNCTION public.handle_new_profile_spectator() SET search_path = public;
ALTER FUNCTION public.handle_new_season() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.handle_new_user_notification_preferences() SET search_path = public;
ALTER FUNCTION public.handle_red_card_suspension() SET search_path = public;
ALTER FUNCTION public.resolve_bet_slips_for_poll(p_poll_id uuid, p_correct_idx integer) SET search_path = public;
ALTER FUNCTION public.resolve_match_polls(p_match_id uuid) SET search_path = public;
ALTER FUNCTION public.sync_captain_on_claim() SET search_path = public;
ALTER FUNCTION public.sync_player_identity_from_profile() SET search_path = public;
ALTER FUNCTION public.try_resolve_slip(p_slip_id uuid) SET search_path = public;

-- Now fix auth_rls_initplan warnings: replace auth.<function>() with (select auth.<function>())
-- First drop all policies we need to update, then recreate them with (select auth.uid()) instead of auth.uid()
-- Let's do this for all policies mentioned in the linter!

-- First, let's check which policies exist - let's drop and recreate them properly

-- Policies for notifications
DROP POLICY IF EXISTS "notif_select_policy" ON public.notifications;
CREATE POLICY "notif_select_policy"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (select auth.uid()) AND role = 'admin'
      )
    )
  );

DROP POLICY IF EXISTS "notif_update_policy" ON public.notifications;
CREATE POLICY "notif_update_policy"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (select auth.uid()) AND role = 'admin'
      )
    )
  );

-- Global channels policy
DROP POLICY IF EXISTS "global_channels: admin update" ON public.global_channels;
CREATE POLICY "global_channels: admin update"
  ON public.global_channels
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );
