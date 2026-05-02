-- ============================================================
-- Migration 012 — atomic season activation
-- Replaces the client-side sequential update pattern
-- ============================================================

create or replace function public.set_active_season(p_season_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  -- Verify caller is admin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Permission denied';
  end if;

  -- Atomic swap: deactivate all, activate the target
  update public.seasons
  set is_active = (id = p_season_id), updated_at = now();
end;
$$;
