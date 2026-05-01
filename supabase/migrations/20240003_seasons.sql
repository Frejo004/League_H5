-- ============================================================
-- Migration 003 — seasons table
-- ============================================================

create table public.seasons (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  start_date  date,
  end_date    date,
  is_active   boolean     not null default false,
  is_locked   boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger seasons_updated_at
  before update on public.seasons
  for each row execute function public.set_updated_at();

-- Enforce only one active season at a time
create unique index seasons_one_active_idx
  on public.seasons (is_active)
  where is_active = true;

-- ============================================================
-- RLS
-- ============================================================
alter table public.seasons enable row level security;

-- Everyone authenticated can read seasons
create policy "seasons: authenticated read"
  on public.seasons for select
  to authenticated
  using (true);

-- Only admins can insert / update / delete
create policy "seasons: admin insert"
  on public.seasons for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "seasons: admin update"
  on public.seasons for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "seasons: admin delete"
  on public.seasons for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
