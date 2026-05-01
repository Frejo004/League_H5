-- ============================================================
-- Migration 006 — matches table
-- ============================================================

create table public.matches (
  id            uuid                 primary key default gen_random_uuid(),
  season_id     uuid                 not null references public.seasons(id) on delete cascade,
  home_team_id  uuid                 not null references public.teams(id) on delete cascade,
  away_team_id  uuid                 not null references public.teams(id) on delete cascade,
  matchday      smallint             not null check (matchday >= 1),
  scheduled_at  timestamptz,
  played_at     timestamptz,
  home_score    smallint             check (home_score >= 0),
  away_score    smallint             check (away_score >= 0),
  status        public.match_status  not null default 'scheduled',
  venue         text,
  created_at    timestamptz          not null default now(),
  updated_at    timestamptz          not null default now(),

  -- A team cannot play against itself
  constraint matches_different_teams check (home_team_id <> away_team_id),

  -- Scores required when completed
  constraint matches_scores_when_completed check (
    status <> 'completed'
    or (home_score is not null and away_score is not null)
  )
);

create index matches_season_idx    on public.matches(season_id);
create index matches_home_team_idx on public.matches(home_team_id);
create index matches_away_team_idx on public.matches(away_team_id);
create index matches_status_idx    on public.matches(status);
create index matches_matchday_idx  on public.matches(season_id, matchday);

create trigger matches_updated_at
  before update on public.matches
  for each row execute function public.set_updated_at();

-- ============================================================
-- RLS
-- ============================================================
alter table public.matches enable row level security;

create policy "matches: authenticated read"
  on public.matches for select
  to authenticated
  using (true);

create policy "matches: admin insert"
  on public.matches for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "matches: admin update"
  on public.matches for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "matches: admin delete"
  on public.matches for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
