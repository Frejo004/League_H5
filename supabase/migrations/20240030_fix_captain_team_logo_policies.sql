-- ============================================================
-- Migration 030 — Fix policies logo équipe capitaine
-- Drop + recreate avec support captain_player_id
-- ============================================================

-- Drop des policies existantes (créées par 028)
drop policy if exists "avatars: captain upload team logo"  on storage.objects;
drop policy if exists "avatars: captain update team logo"  on storage.objects;
drop policy if exists "avatars: captain delete team logo"  on storage.objects;
drop policy if exists "avatars: admin manage team logos"   on storage.objects;

-- INSERT
create policy "avatars: captain upload team logo"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and name like 'teams/%'
    and exists (
      select 1 from public.teams
      where id::text = split_part(name, '/', 2)
        and (
          captain_id = auth.uid()
          or exists (
            select 1 from public.players p
            where p.id = teams.captain_player_id
              and p.user_id = auth.uid()
          )
        )
    )
  );

-- UPDATE
create policy "avatars: captain update team logo"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and name like 'teams/%'
    and exists (
      select 1 from public.teams
      where id::text = split_part(name, '/', 2)
        and (
          captain_id = auth.uid()
          or exists (
            select 1 from public.players p
            where p.id = teams.captain_player_id
              and p.user_id = auth.uid()
          )
        )
    )
  )
  with check (
    bucket_id = 'avatars'
    and name like 'teams/%'
    and exists (
      select 1 from public.teams
      where id::text = split_part(name, '/', 2)
        and (
          captain_id = auth.uid()
          or exists (
            select 1 from public.players p
            where p.id = teams.captain_player_id
              and p.user_id = auth.uid()
          )
        )
    )
  );

-- DELETE
create policy "avatars: captain delete team logo"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and name like 'teams/%'
    and exists (
      select 1 from public.teams
      where id::text = split_part(name, '/', 2)
        and (
          captain_id = auth.uid()
          or exists (
            select 1 from public.players p
            where p.id = teams.captain_player_id
              and p.user_id = auth.uid()
          )
        )
    )
  );

-- Admin
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
