-- ============================================================
-- Migration 005 — players table
-- ============================================================

create table public.players (
  id             uuid                   primary key default gen_random_uuid(),
  team_id        uuid                   not null references public.teams(id) on delete cascade,
  season_id      uuid                   not null references public.seasons(id) on delete cascade,
  user_id        uuid                   references public.profiles(id) on delete set null,
  first_name     text                   not null,
  last_name      text                   not null,
  jersey_number  smallint               check (jersey_number >= 1 and jersey_number <= 99),
  position       public.player_position,
  avatar_url     text,
  is_active      boolean                not null default true,
  created_at     timestamptz            not null default now(),
  updated_at     timestamptz            not null default now()
);

create index players_team_idx    on public.players(team_id);
create index players_season_idx  on public.players(season_id);
create index players_user_idx    on public.players(user_id);

-- Jersey numbers must be unique within a team per season
create unique index players_jersey_team_idx
  on public.players(team_id, jersey_number)
  where jersey_number is not null and is_active = true;

create trigger players_updated_at
  before update on public.players
  for each row execute function public.set_updated_at();

-- ============================================================
-- RLS
-- ============================================================
alter table public.players enable row level security;

create policy "players: authenticated read"
  on public.players for select
  to authenticated
  using (true);

create policy "players: admin insert"
  on public.players for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "players: admin update"
  on public.players for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Captains can manage players in their team
create policy "players: captain manage own team"
  on public.players for all
  to authenticated
  using (
    exists (
      select 1 from public.teams
      where teams.id = players.team_id
        and teams.captain_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.teams
      where teams.id = players.team_id
        and teams.captain_id = auth.uid()
    )
  );

create policy "players: admin delete"
  on public.players for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
