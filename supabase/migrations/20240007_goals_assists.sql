-- ============================================================
-- Migration 007 — goals & assists tables
-- ============================================================

-- ------------------------------------------------------------
-- goals
-- ------------------------------------------------------------
create table public.goals (
  id          uuid        primary key default gen_random_uuid(),
  match_id    uuid        not null references public.matches(id) on delete cascade,
  player_id   uuid        not null references public.players(id) on delete cascade,
  team_id     uuid        not null references public.teams(id) on delete cascade,
  minute      smallint    check (minute >= 1 and minute <= 120),
  is_own_goal boolean     not null default false,
  created_at  timestamptz not null default now()
);

create index goals_match_idx   on public.goals(match_id);
create index goals_player_idx  on public.goals(player_id);
create index goals_team_idx    on public.goals(team_id);

-- ------------------------------------------------------------
-- assists
-- ------------------------------------------------------------
create table public.assists (
  id          uuid        primary key default gen_random_uuid(),
  match_id    uuid        not null references public.matches(id) on delete cascade,
  goal_id     uuid        not null references public.goals(id) on delete cascade,
  player_id   uuid        not null references public.players(id) on delete cascade,
  created_at  timestamptz not null default now(),

  -- One assist per goal maximum
  constraint assists_one_per_goal unique (goal_id)
);

create index assists_match_idx   on public.assists(match_id);
create index assists_goal_idx    on public.assists(goal_id);
create index assists_player_idx  on public.assists(player_id);

-- ============================================================
-- RLS — goals
-- ============================================================
alter table public.goals enable row level security;

create policy "goals: authenticated read"
  on public.goals for select
  to authenticated
  using (true);

create policy "goals: admin insert"
  on public.goals for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "goals: admin update"
  on public.goals for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "goals: admin delete"
  on public.goals for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ============================================================
-- RLS — assists
-- ============================================================
alter table public.assists enable row level security;

create policy "assists: authenticated read"
  on public.assists for select
  to authenticated
  using (true);

create policy "assists: admin insert"
  on public.assists for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "assists: admin update"
  on public.assists for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "assists: admin delete"
  on public.assists for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
