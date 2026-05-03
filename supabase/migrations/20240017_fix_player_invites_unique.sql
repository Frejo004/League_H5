-- ============================================================
-- Migration 017 — fix player_invites unique constraint
-- Allow new invite when previous is expired/used
-- ============================================================

-- Drop the table-level constraint (blocks new invites for expired ones)
alter table public.player_invites
  drop constraint player_invites_one_per_player;

-- Replace with a partial unique index: only one *active* invite per player
create unique index player_invites_one_active_per_player
  on public.player_invites(player_id)
  where used_at is null;
