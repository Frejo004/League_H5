-- ============================================================
-- Migration 028 — Team logo storage policies
-- Le capitaine peut uploader/modifier le logo de son équipe
-- dans le bucket 'avatars' sous le chemin teams/{team_id}/logo
-- ============================================================

-- INSERT : le capitaine peut uploader le logo de son équipe
create policy "avatars: captain upload team logo"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and name like 'teams/%'
    and exists (
      select 1 from public.teams
      where id::text = split_part(name, '/', 2)
        and captain_id = auth.uid()
    )
  );

-- UPDATE : le capitaine peut modifier le logo de son équipe
create policy "avatars: captain update team logo"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and name like 'teams/%'
    and exists (
      select 1 from public.teams
      where id::text = split_part(name, '/', 2)
        and captain_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'avatars'
    and name like 'teams/%'
    and exists (
      select 1 from public.teams
      where id::text = split_part(name, '/', 2)
        and captain_id = auth.uid()
    )
  );

-- DELETE : le capitaine peut supprimer le logo de son équipe
create policy "avatars: captain delete team logo"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and name like 'teams/%'
    and exists (
      select 1 from public.teams
      where id::text = split_part(name, '/', 2)
        and captain_id = auth.uid()
    )
  );

-- L'admin peut aussi gérer tous les logos d'équipe
create policy "avatars: admin manage team logos"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'avatars'
    and name like 'teams/%'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    bucket_id = 'avatars'
    and name like 'teams/%'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
