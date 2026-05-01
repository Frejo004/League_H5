-- ============================================================
-- Migration 008 — mvp_votes table
-- ============================================================

create table public.mvp_votes (
  id          uuid        primary key default gen_random_uuid(),
  match_id    uuid        not null references public.matches(id) on delete cascade,
  player_id   uuid        not null references public.players(id) on delete cascade,
  voted_by    uuid        not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),

  -- One vote per user per match
  constraint mvp_votes_unique_vote unique (match_id, voted_by)
);

create index mvp_votes_match_idx    on public.mvp_votes(match_id);
create index mvp_votes_player_idx   on public.mvp_votes(player_id);
create index mvp_votes_voted_by_idx on public.mvp_votes(voted_by);

-- ============================================================
-- RLS
-- ============================================================
alter table public.mvp_votes enable row level security;

create policy "mvp_votes: authenticated read"
  on public.mvp_votes for select
  to authenticated
  using (true);

-- Any authenticated user can vote
create policy "mvp_votes: authenticated insert"
  on public.mvp_votes for insert
  to authenticated
  with check (voted_by = auth.uid());

-- Users can change their own vote
create policy "mvp_votes: own update"
  on public.mvp_votes for update
  to authenticated
  using (voted_by = auth.uid())
  with check (voted_by = auth.uid());

-- Users can delete their own vote
create policy "mvp_votes: own delete"
  on public.mvp_votes for delete
  to authenticated
  using (voted_by = auth.uid());
