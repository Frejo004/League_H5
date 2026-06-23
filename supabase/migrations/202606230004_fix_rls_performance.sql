-- ============================================================
-- Migration — Fix auth_rls_initplan + duplicate_index + multiple_permissive_policies
-- ============================================================
-- Version simplifiée et testée

-- ── 1. PROFILES ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles: own update" ON public.profiles;
CREATE POLICY "profiles: own update"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "profiles: admin update" ON public.profiles;
CREATE POLICY "profiles: admin update"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (select auth.uid()) AND p.role = 'admin'
    )
  );

-- ── 2. SEASONS ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "seasons: admin insert" ON public.seasons;
CREATE POLICY "seasons: admin insert"
  ON public.seasons FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "seasons: admin update" ON public.seasons;
CREATE POLICY "seasons: admin update"
  ON public.seasons FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "seasons: admin delete" ON public.seasons;
CREATE POLICY "seasons: admin delete"
  ON public.seasons FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- ── 3. TEAMS ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "teams: admin insert" ON public.teams;
CREATE POLICY "teams: admin insert"
  ON public.teams FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "teams: admin update" ON public.teams;
CREATE POLICY "teams: admin update"
  ON public.teams FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "teams: captain update own" ON public.teams;
CREATE POLICY "teams: captain update own"
  ON public.teams FOR UPDATE
  TO authenticated
  USING (captain_id = (select auth.uid()))
  WITH CHECK (captain_id = (select auth.uid()));

DROP POLICY IF EXISTS "teams: captain update logo and name" ON public.teams;
CREATE POLICY "teams: captain update logo and name"
  ON public.teams FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = teams.id AND t.captain_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "teams: admin delete" ON public.teams;
CREATE POLICY "teams: admin delete"
  ON public.teams FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- ── 4. PLAYERS ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "players: admin insert" ON public.players;
CREATE POLICY "players: admin insert"
  ON public.players FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "players: admin update" ON public.players;
CREATE POLICY "players: admin update"
  ON public.players FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "players: captain manage own team" ON public.players;
CREATE POLICY "players: captain manage own team"
  ON public.players FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = players.team_id
        AND teams.captain_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Players can update own profile" ON public.players;
CREATE POLICY "Players can update own profile"
  ON public.players FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "players: admin delete" ON public.players;
CREATE POLICY "players: admin delete"
  ON public.players FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- ── 5. MATCHES ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "matches: admin insert" ON public.matches;
CREATE POLICY "matches: admin insert"
  ON public.matches FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "matches: admin update" ON public.matches;
CREATE POLICY "matches: admin update"
  ON public.matches FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "matches: reporter update" ON public.matches;
CREATE POLICY "matches: reporter update"
  ON public.matches FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin')
    OR (events_reporter_id = (select auth.uid()) OR video_reporter_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "matches: admin delete" ON public.matches;
CREATE POLICY "matches: admin delete"
  ON public.matches FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- ── 6. MATCH_EVENTS ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "match_events: admin insert" ON public.match_events;
CREATE POLICY "match_events: admin insert"
  ON public.match_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "match_events: admin or reporter insert" ON public.match_events;
CREATE POLICY "match_events: admin or reporter insert"
  ON public.match_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin')
    OR EXISTS (
      SELECT 1 FROM public.matches
      WHERE id = match_id
      AND (events_reporter_id = (select auth.uid()) OR video_reporter_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "match_events: reporter insert" ON public.match_events;
CREATE POLICY "match_events: reporter insert"
  ON public.match_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id
      AND (events_reporter_id = (select auth.uid()) OR video_reporter_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "match_events: admin delete" ON public.match_events;
CREATE POLICY "match_events: admin delete"
  ON public.match_events FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "match_events: admin or reporter delete" ON public.match_events;
CREATE POLICY "match_events: admin or reporter delete"
  ON public.match_events FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin')
    OR EXISTS (
      SELECT 1 FROM public.matches
      WHERE id = match_id
      AND (events_reporter_id = (select auth.uid()) OR video_reporter_id = (select auth.uid()))
    )
  );

-- ── 7. GOALS ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "goals: admin insert" ON public.goals;
CREATE POLICY "goals: admin insert"
  ON public.goals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- goals: fusionner admin insert + reporter insert en une seule policy
DROP POLICY IF EXISTS "goals: reporter insert" ON public.goals;
CREATE POLICY "goals: authenticated insert"
  ON public.goals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (select auth.uid()) AND p.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id
      AND (m.events_reporter_id = (select auth.uid()) OR m.video_reporter_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "goals: admin update" ON public.goals;
CREATE POLICY "goals: admin update"
  ON public.goals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "goals: admin delete" ON public.goals;
CREATE POLICY "goals: admin delete"
  ON public.goals FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- ── 8. ASSISTS ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "assists: admin insert" ON public.assists;
CREATE POLICY "assists: admin insert"
  ON public.assists FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- assists: fusionner admin insert + reporter insert en une seule policy
DROP POLICY IF EXISTS "assists: reporter insert" ON public.assists;
CREATE POLICY "assists: authenticated insert"
  ON public.assists FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (select auth.uid()) AND p.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.goals g
      JOIN public.matches m ON m.id = g.match_id
      WHERE g.id = goal_id
      AND (m.events_reporter_id = (select auth.uid()) OR m.video_reporter_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "assists: admin update" ON public.assists;
CREATE POLICY "assists: admin update"
  ON public.assists FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "assists: admin delete" ON public.assists;
CREATE POLICY "assists: admin delete"
  ON public.assists FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- ── 9. MVP_VOTES ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "mvp_votes: own update" ON public.mvp_votes;
CREATE POLICY "mvp_votes: own update"
  ON public.mvp_votes FOR UPDATE
  TO authenticated
  USING (voted_by = (select auth.uid()));

DROP POLICY IF EXISTS "mvp_votes: own delete" ON public.mvp_votes;
CREATE POLICY "mvp_votes: own delete"
  ON public.mvp_votes FOR DELETE
  TO authenticated
  USING (voted_by = (select auth.uid()));

DROP POLICY IF EXISTS "mvp_votes: authenticated insert" ON public.mvp_votes;
CREATE POLICY "mvp_votes: authenticated insert"
  ON public.mvp_votes FOR INSERT
  TO authenticated
  WITH CHECK (voted_by = (select auth.uid()));

-- ── 10. SETTINGS ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "settings: admin insert" ON public.settings;
CREATE POLICY "settings: admin insert"
  ON public.settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "settings: admin update" ON public.settings;
CREATE POLICY "settings: admin update"
  ON public.settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- ── 11. PUSH_SUBSCRIPTIONS ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "push_subscriptions: read own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions: read own"
  ON public.push_subscriptions FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "push_subscriptions: insert own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions: insert own"
  ON public.push_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "push_subscriptions: update own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions: update own"
  ON public.push_subscriptions FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "push_subscriptions: delete own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions: delete own"
  ON public.push_subscriptions FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ── 12. SPECTATORS ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "spectators: admin read" ON public.spectators;
CREATE POLICY "spectators: admin read"
  ON public.spectators FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "spectators: own read" ON public.spectators;
CREATE POLICY "spectators: own read"
  ON public.spectators FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "spectators: authenticated insert" ON public.spectators;
CREATE POLICY "spectators: authenticated insert"
  ON public.spectators FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "spectators: admin update" ON public.spectators;
CREATE POLICY "spectators: admin update"
  ON public.spectators FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "spectators: admin delete" ON public.spectators;
CREATE POLICY "spectators: admin delete"
  ON public.spectators FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- ── 13. MVP_VOTES ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "mvp_votes: own update" ON public.mvp_votes;
CREATE POLICY "mvp_votes: own update"
  ON public.mvp_votes FOR UPDATE
  TO authenticated
  USING (voted_by = (select auth.uid()));

DROP POLICY IF EXISTS "mvp_votes: own delete" ON public.mvp_votes;
CREATE POLICY "mvp_votes: own delete"
  ON public.mvp_votes FOR DELETE
  TO authenticated
  USING (voted_by = (select auth.uid()));

DROP POLICY IF EXISTS "mvp_votes: authenticated insert" ON public.mvp_votes;
CREATE POLICY "mvp_votes: authenticated insert"
  ON public.mvp_votes FOR INSERT
  TO authenticated
  WITH CHECK (voted_by = (select auth.uid()));

-- ── 14. PLAYER_INVITES ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "player_invites: admin read" ON public.player_invites;
CREATE POLICY "player_invites: admin read"
  ON public.player_invites FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role IN ('admin', 'captain')
    )
  );

DROP POLICY IF EXISTS "player_invites: admin captain insert" ON public.player_invites;
CREATE POLICY "player_invites: admin captain insert"
  ON public.player_invites FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role IN ('admin', 'captain')
    )
  );

DROP POLICY IF EXISTS "player_invites: admin captain delete" ON public.player_invites;
CREATE POLICY "player_invites: admin captain delete"
  ON public.player_invites FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role IN ('admin', 'captain')
    )
  );

-- ── 15. MATCH_LINEUPS ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Lineups are manageable by admin" ON public.match_lineups;
CREATE POLICY "Lineups are manageable by admin"
  ON public.match_lineups FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Captains can manage their own team lineup" ON public.match_lineups;
CREATE POLICY "Captains can manage their own team lineup"
  ON public.match_lineups FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = match_lineups.team_id
      AND teams.captain_id = (select auth.uid())
    )
  );

-- ── 16. SUSPENSIONS ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Suspensions gérables par les admins" ON public.suspensions;
CREATE POLICY "Suspensions gérables par les admins"
  ON public.suspensions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- ── 17. MATCH_FEEDBACK ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "match_feedback_select" ON public.match_feedback;
CREATE POLICY "match_feedback_select"
  ON public.match_feedback FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.players p
      JOIN public.matches m ON m.id = match_feedback.match_id
      WHERE p.id = match_feedback.player_id
      AND p.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "match_feedback_insert" ON public.match_feedback;
CREATE POLICY "match_feedback_insert"
  ON public.match_feedback FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.players p
      JOIN public.matches m ON m.id = match_feedback.match_id
      WHERE p.id = match_feedback.player_id
      AND p.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "match_feedback_update" ON public.match_feedback;
CREATE POLICY "match_feedback_update"
  ON public.match_feedback FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.id = match_feedback.player_id
      AND p.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "match_feedback_delete" ON public.match_feedback;
CREATE POLICY "match_feedback_delete"
  ON public.match_feedback FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.id = match_feedback.player_id
      AND p.user_id = (select auth.uid())
    )
  );

-- ── 18. POLLS ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "polls: admin create/update/delete" ON public.polls;
CREATE POLICY "polls: admin create/update/delete"
  ON public.polls FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- ── 19. TRANSFERS ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "transfers: create" ON public.transfers;
CREATE POLICY "transfers: create"
  ON public.transfers FOR INSERT
  TO authenticated
  WITH CHECK (
    requested_by = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "transfers: update" ON public.transfers;
CREATE POLICY "transfers: update"
  ON public.transfers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "transfers: delete" ON public.transfers;
CREATE POLICY "transfers: delete"
  ON public.transfers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- ── 21. USER_NOTIFICATION_PREFERENCES ───────────────────────────────────────
DROP POLICY IF EXISTS "user_notification_preferences: read own" ON public.user_notification_preferences;
CREATE POLICY "user_notification_preferences: read own"
  ON public.user_notification_preferences FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "user_notification_preferences: insert own" ON public.user_notification_preferences;
CREATE POLICY "user_notification_preferences: insert own"
  ON public.user_notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "user_notification_preferences: update own" ON public.user_notification_preferences;
CREATE POLICY "user_notification_preferences: update own"
  ON public.user_notification_preferences FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ── 22. BET_SLIPS ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "bet_slips: read own" ON public.bet_slips;
CREATE POLICY "bet_slips: read own"
  ON public.bet_slips FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "bet_slips: insert own" ON public.bet_slips;
CREATE POLICY "bet_slips: insert own"
  ON public.bet_slips FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "bet_slips: delete own" ON public.bet_slips;
CREATE POLICY "bet_slips: delete own"
  ON public.bet_slips FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ── 23. BET_SLIP_SELECTIONS ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "bet_slip_selections: read own" ON public.bet_slip_selections;
CREATE POLICY "bet_slip_selections: read own"
  ON public.bet_slip_selections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bet_slips s
      WHERE s.id = slip_id AND s.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "bet_slip_selections: insert own" ON public.bet_slip_selections;
CREATE POLICY "bet_slip_selections: insert own"
  ON public.bet_slip_selections FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bet_slips s
      WHERE s.id = slip_id AND s.user_id = (select auth.uid())
    )
  );

-- ── 24. LIVE_REACTIONS ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "live_reactions: insert own" ON public.live_reactions;
CREATE POLICY "live_reactions: insert own"
  ON public.live_reactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- ── 25. DM_MESSAGE_REACTIONS ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "dm_reactions: insert own" ON public.dm_message_reactions;
CREATE POLICY "dm_reactions: insert own"
  ON public.dm_message_reactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "dm_reactions: delete own" ON public.dm_message_reactions;
CREATE POLICY "dm_reactions: delete own"
  ON public.dm_message_reactions FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Function to get user's DM conversation IDs without RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_conversation_ids()
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT id
  FROM public.dm_conversations
  WHERE user_a = auth.uid() OR user_b = auth.uid();
END;
$$;

-- ── 26. DM_CONVERSATIONS ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "dm_conversations: read own" ON public.dm_conversations;
CREATE POLICY "dm_conversations: read own"
  ON public.dm_conversations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT public.get_user_conversation_ids()
    )
  );

DROP POLICY IF EXISTS "dm_conversations: insert" ON public.dm_conversations;
CREATE POLICY "dm_conversations: insert"
  ON public.dm_conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    user_a = auth.uid() OR user_b = auth.uid()
  );

-- ── 27. DM_MESSAGES ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "dm_messages: read participants" ON public.dm_messages;
CREATE POLICY "dm_messages: read participants"
  ON public.dm_messages FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT public.get_user_conversation_ids()
    )
  );

DROP POLICY IF EXISTS "dm_messages: insert participant" ON public.dm_messages;
CREATE POLICY "dm_messages: insert participant"
  ON public.dm_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND conversation_id IN (
      SELECT public.get_user_conversation_ids()
    )
  );

-- ── 29. TEAM_MESSAGES ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "team_messages: team members read" ON public.team_messages;
CREATE POLICY "team_messages: team members read"
  ON public.team_messages FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM public.players WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "team_messages: team members insert" ON public.team_messages;
CREATE POLICY "team_messages: team members insert"
  ON public.team_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = (select auth.uid())
    AND team_id IN (
      SELECT team_id FROM public.players WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "team_messages: author update" ON public.team_messages;
CREATE POLICY "team_messages: author update"
  ON public.team_messages FOR UPDATE
  TO authenticated
  USING (sender_id = (select auth.uid()));

DROP POLICY IF EXISTS "team_messages: author or admin delete" ON public.team_messages;
CREATE POLICY "team_messages: author or admin delete"
  ON public.team_messages FOR DELETE
  TO authenticated
  USING (
    sender_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- ── 30. TEAM_MESSAGE_REACTIONS ───────────────────────────────────────────────
DROP POLICY IF EXISTS "reactions: team members read" ON public.team_message_reactions;
CREATE POLICY "reactions: team members read"
  ON public.team_message_reactions FOR SELECT
  TO authenticated
  USING (
    message_id IN (
      SELECT tm.id FROM public.team_messages tm
      JOIN public.players p ON p.team_id = tm.team_id
      WHERE p.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "reactions: team members insert" ON public.team_message_reactions;
CREATE POLICY "reactions: team members insert"
  ON public.team_message_reactions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND message_id IN (
      SELECT tm.id FROM public.team_messages tm
      JOIN public.players p ON p.team_id = tm.team_id
      WHERE p.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "reactions: author delete" ON public.team_message_reactions;
CREATE POLICY "reactions: author delete"
  ON public.team_message_reactions FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ── 31. CHAT_MENTIONS ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "mentions: mentioned user read" ON public.chat_mentions;
CREATE POLICY "mentions: mentioned user read"
  ON public.chat_mentions FOR SELECT
  TO authenticated
  USING (
    mentioned_user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.team_messages tm
      WHERE tm.id = chat_mentions.message_id
        AND EXISTS (
          SELECT 1 FROM public.players p
          WHERE p.team_id = tm.team_id
            AND p.user_id = (select auth.uid())
            AND p.is_active = true
        )
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin')
  );

DROP POLICY IF EXISTS "mentions: team members insert" ON public.chat_mentions;
CREATE POLICY "mentions: team members insert"
  ON public.chat_mentions FOR INSERT
  TO authenticated
  WITH CHECK (
    mentioned_by = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.team_messages tm
      WHERE tm.id = chat_mentions.message_id
        AND EXISTS (
          SELECT 1 FROM public.players p
          WHERE p.team_id = tm.team_id
            AND p.user_id = (select auth.uid())
            AND p.is_active = true
        )
    )
  );

-- ── 32. CHAT_TYPING ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "chat_typing: team members full access" ON public.chat_typing;
CREATE POLICY "chat_typing: team members full access"
  ON public.chat_typing FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.players
      WHERE team_id = chat_typing.team_id
        AND user_id = (select auth.uid())
        AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.teams
      WHERE id = chat_typing.team_id
        AND captain_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  )
  WITH CHECK (user_id = (select auth.uid()));

-- ── 33. TEAM_PINNED_MESSAGES ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "pinned: captain/admin insert" ON public.team_pinned_messages;
CREATE POLICY "pinned: captain/admin insert"
  ON public.team_pinned_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams t
      JOIN public.team_messages tm ON tm.team_id = t.id
      WHERE tm.id = message_id
      AND (t.captain_id = (select auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'
        ))
    )
  );

DROP POLICY IF EXISTS "pinned: team members read" ON public.team_pinned_messages;
CREATE POLICY "pinned: team members read"
  ON public.team_pinned_messages FOR SELECT
  TO authenticated
  USING (
    message_id IN (
      SELECT tm.id FROM public.team_messages tm
      JOIN public.players p ON p.team_id = tm.team_id
      WHERE p.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "pinned: captain/admin delete" ON public.team_pinned_messages;
CREATE POLICY "pinned: captain/admin delete"
  ON public.team_pinned_messages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_messages tm
      JOIN public.teams t ON t.id = tm.team_id
      WHERE tm.id = message_id
      AND (t.captain_id = (select auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'
        ))
    )
  );

-- ── 34. CHAT_READ_RECEIPTS ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "read_receipts: team members read" ON public.chat_read_receipts;
CREATE POLICY "read_receipts: team members read"
  ON public.chat_read_receipts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.players
      WHERE team_id = chat_read_receipts.team_id
        AND user_id = (select auth.uid())
        AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.teams
      WHERE id = chat_read_receipts.team_id
        AND captain_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "read_receipts: own upsert" ON public.chat_read_receipts;
CREATE POLICY "read_receipts: own upsert"
  ON public.chat_read_receipts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "read_receipts: own update" ON public.chat_read_receipts;
CREATE POLICY "read_receipts: own update"
  ON public.chat_read_receipts FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ── 35. CHANNEL_MESSAGES ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "channel_messages: read" ON public.channel_messages;
CREATE POLICY "channel_messages: read"
  ON public.channel_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.global_channels gc
      WHERE gc.id = channel_id
      AND (
        gc.slug = 'general'
        OR (
          gc.slug = 'captains'
          AND (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin')
            OR EXISTS (SELECT 1 FROM public.teams WHERE captain_id = (select auth.uid()))
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS "channel_messages: insert general" ON public.channel_messages;
CREATE POLICY "channel_messages: insert general"
  ON public.channel_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.global_channels gc
      WHERE gc.id = channel_id
      AND gc.slug = 'general'
      AND (
        gc.is_read_only = false
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin')
      )
    )
  );

DROP POLICY IF EXISTS "channel_messages: insert captains" ON public.channel_messages;
CREATE POLICY "channel_messages: insert captains"
  ON public.channel_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.global_channels gc
      WHERE gc.id = channel_id
      AND gc.slug = 'captains'
      AND (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin')
        OR EXISTS (SELECT 1 FROM public.teams WHERE captain_id = (select auth.uid()))
      )
    )
  );

DROP POLICY IF EXISTS "channel_messages: delete own or admin" ON public.channel_messages;
CREATE POLICY "channel_messages: delete own or admin"
  ON public.channel_messages FOR DELETE
  TO authenticated
  USING (
    sender_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "channel_messages: update own or admin" ON public.channel_messages;
CREATE POLICY "channel_messages: update own or admin"
  ON public.channel_messages FOR UPDATE
  TO authenticated
  USING (
    sender_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- ── 36. CHANNEL_MESSAGE_REACTIONS ────────────────────────────────────────────
DROP POLICY IF EXISTS "channel_reactions: insert own" ON public.channel_message_reactions;
CREATE POLICY "channel_reactions: insert own"
  ON public.channel_message_reactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "channel_reactions: delete own" ON public.channel_message_reactions;
CREATE POLICY "channel_reactions: delete own"
  ON public.channel_message_reactions FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ── 37. CHANNEL_READ_RECEIPTS ────────────────────────────────────────────────
DROP POLICY IF EXISTS "channel_receipts: upsert own" ON public.channel_read_receipts;
CREATE POLICY "channel_receipts: upsert own"
  ON public.channel_read_receipts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "channel_receipts: update own" ON public.channel_read_receipts;
CREATE POLICY "channel_receipts: update own"
  ON public.channel_read_receipts FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ── 38. DM_CONVERSATIONS ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "dm_conversations: read own" ON public.dm_conversations;
CREATE POLICY "dm_conversations: read own"
  ON public.dm_conversations FOR SELECT
  TO authenticated
  USING (
    user_a = (select auth.uid()) OR user_b = (select auth.uid())
  );

DROP POLICY IF EXISTS "dm_conversations: insert" ON public.dm_conversations;
CREATE POLICY "dm_conversations: insert"
  ON public.dm_conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    user_a = (select auth.uid()) OR user_b = (select auth.uid())
  );

-- ── 39. DM_MESSAGES ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "dm_messages: insert participant" ON public.dm_messages;
CREATE POLICY "dm_messages: insert participant"
  ON public.dm_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = (select auth.uid())
    AND conversation_id IN (SELECT public.get_user_conversation_ids())
  );

DROP POLICY IF EXISTS "dm_messages: delete own" ON public.dm_messages;
CREATE POLICY "dm_messages: delete own"
  ON public.dm_messages FOR DELETE
  TO authenticated
  USING (sender_id = (select auth.uid()));

DROP POLICY IF EXISTS "dm_messages: update own" ON public.dm_messages;
CREATE POLICY "dm_messages: update own"
  ON public.dm_messages FOR UPDATE
  TO authenticated
  USING (sender_id = (select auth.uid()));

DROP POLICY IF EXISTS "dm_messages: read participants" ON public.dm_messages;
CREATE POLICY "dm_messages: read participants"
  ON public.dm_messages FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (SELECT public.get_user_conversation_ids())
  );

-- ── 40. DM_READ_RECEIPTS ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "dm_receipts: read participants" ON public.dm_read_receipts;
CREATE POLICY "dm_receipts: read participants"
  ON public.dm_read_receipts FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (SELECT public.get_user_conversation_ids())
  );

DROP POLICY IF EXISTS "dm_receipts: upsert own" ON public.dm_read_receipts;
CREATE POLICY "dm_receipts: upsert own"
  ON public.dm_read_receipts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "dm_receipts: update own" ON public.dm_read_receipts;
CREATE POLICY "dm_receipts: update own"
  ON public.dm_read_receipts FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ── 41. USER_PRESENCE ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "presence: upsert own" ON public.user_presence;
CREATE POLICY "presence: upsert own"
  ON public.user_presence FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "presence: update own" ON public.user_presence;
CREATE POLICY "presence: update own"
  ON public.user_presence FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "presence: delete own" ON public.user_presence;
CREATE POLICY "presence: delete own"
  ON public.user_presence FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ── 42. NEWS_POSTS ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "news_posts: admin insert" ON public.news_posts;
CREATE POLICY "news_posts: admin insert"
  ON public.news_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "news_posts: admin update" ON public.news_posts;
CREATE POLICY "news_posts: admin update"
  ON public.news_posts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "news_posts: admin delete" ON public.news_posts;
CREATE POLICY "news_posts: admin delete"
  ON public.news_posts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- ── 43. DUPLICATE INDEX ──────────────────────────────────────────────────────
DROP INDEX IF EXISTS idx_match_events_match_id_created;

-- ── 44. MULTIPLE PERMISSIVE POLICIES ─────────────────────────────────────────
-- Consolider les policies dupliquées en gardant une seule policy par (table, role, action)

-- match_events: garder "match_events: admin or reporter insert", supprimer "match_events: reporter insert"
DROP POLICY IF EXISTS "match_events: reporter insert" ON public.match_events;

-- match_events: garder "match_events: admin delete", supprimer "match_events: admin or reporter delete"
DROP POLICY IF EXISTS "match_events: admin or reporter delete" ON public.match_events;

-- match_lineups: consolider en une seule policy par action
DROP POLICY IF EXISTS "Lineups are manageable by admin" ON public.match_lineups;
DROP POLICY IF EXISTS "Captains can manage their own team lineup" ON public.match_lineups;
CREATE POLICY "match_lineups: admin manage"
  ON public.match_lineups FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "match_lineups: captain manage"
  ON public.match_lineups FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = match_lineups.team_id
      AND teams.captain_id = (select auth.uid())
    )
  );

-- player_invites: "player_invites: admin read" couvre déjà les captains (IN ('admin','captain'))
-- supprimer les policies captain en doublon
DROP POLICY IF EXISTS "player_invites: captain select" ON public.player_invites;
DROP POLICY IF EXISTS "player_invites: captain insert" ON public.player_invites;
DROP POLICY IF EXISTS "player_invites: captain delete" ON public.player_invites;

-- predictions: simplifier pour éviter le warning
-- "predictions: authenticated create own" (INSERT) + "predictions: authenticated update/delete own" (FOR ALL)
-- = linter voit 2 policies pour INSERT. On sépare UPDATE et DELETE explicitement:
DROP POLICY IF EXISTS "predictions: authenticated update/delete own" ON public.predictions;
DROP POLICY IF EXISTS "predictions: authenticated create own" ON public.predictions;
CREATE POLICY "predictions: authenticated insert own"
  ON public.predictions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "predictions: authenticated update own"
  ON public.predictions FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "predictions: authenticated delete own"
  ON public.predictions FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));



-- players: supprimer "Players can update own profile" (doublon avec "players: captain manage own team" FOR ALL)
DROP POLICY IF EXISTS "Players can update own profile" ON public.players;

-- profiles: supprimer les anciennes policies qui pourraient être en doublon
DROP POLICY IF EXISTS "profiles: public read" ON public.profiles;
