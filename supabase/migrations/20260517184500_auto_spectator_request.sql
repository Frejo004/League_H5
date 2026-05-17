-- ============================================================
-- Migration: Automatically create spectator requests on profile creation
-- and backfill any missing ones for the active season.
-- ============================================================

-- 1. Create trigger function
create or replace function public.handle_new_profile_spectator()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  active_season_id uuid;
begin
  -- Only execute if the role is 'spectator'
  if new.role = 'spectator' then
    -- Find the active season
    select id into active_season_id from public.seasons where is_active = true limit 1;

    -- If there is an active season, insert a pending spectator request
    if active_season_id is not null then
      insert into public.spectators (user_id, season_id, status, requested_at)
      values (new.id, active_season_id, 'pending', now())
      on conflict (user_id, season_id) do nothing;
    end if;
  end if;
  return new;
end;
$$;

-- 2. Create the trigger on public.profiles
drop trigger if exists on_profile_spectator_created on public.profiles;
create trigger on_profile_spectator_created
  after insert on public.profiles
  for each row execute function public.handle_new_profile_spectator();

-- 3. Backfill existing spectators who do not have a request for the active season
insert into public.spectators (user_id, season_id, status, requested_at)
select p.id, s.id, 'pending', p.created_at
from public.profiles p
cross join public.seasons s
left join public.spectators sp on sp.user_id = p.id and sp.season_id = s.id
where p.role = 'spectator'
  and s.is_active = true
  and sp.id is null
on conflict (user_id, season_id) do nothing;
