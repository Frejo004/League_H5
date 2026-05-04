-- ============================================================
-- Migration 027 — fix set_active_season (WHERE clause required)
-- ============================================================

create or replace function public.set_active_season(p_season_id uuid)
returns void
language plpgsql security definer set search_path = public as $
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Permission denied';
  end if;

  -- Désactiver toutes les saisons actives (sauf la cible)
  update public.seasons
  set is_active = false, updated_at = now()
  where is_active = true
    and id <> p_season_id;

  -- Activer la saison cible
  update public.seasons
  set is_active = true, updated_at = now()
  where id = p_season_id;
end;
$;

-- Permettre à l'admin de supprimer une saison
create policy "seasons: admin delete"
  on public.seasons for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
