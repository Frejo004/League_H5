-- ============================================================
-- Migration 020 — fix avatars storage policies
-- Le upsert côté client fait un INSERT si le fichier n'existe pas,
-- puis un UPDATE s'il existe déjà. La policy "update" précédente
-- utilisait uniquement USING sans WITH CHECK, ce qui bloquait
-- les updates. On recrée les deux policies proprement.
-- ============================================================

-- Drop existing policies
drop policy if exists "avatars: own upload" on storage.objects;
drop policy if exists "avatars: own update" on storage.objects;
drop policy if exists "avatars: own delete" on storage.objects;
drop policy if exists "avatars: public read" on storage.objects;

-- INSERT : l'utilisateur peut uploader dans son propre dossier
create policy "avatars: own upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and name like auth.uid()::text || '/%'
  );

-- UPDATE : l'utilisateur peut modifier ses propres fichiers
create policy "avatars: own update"
  on storage.objects for update
  to authenticated
  using   (bucket_id = 'avatars' and name like auth.uid()::text || '/%')
  with check (bucket_id = 'avatars' and name like auth.uid()::text || '/%');

-- DELETE : l'utilisateur peut supprimer ses propres fichiers
create policy "avatars: own delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and name like auth.uid()::text || '/%'
  );

-- SELECT : lecture publique (bucket public)
create policy "avatars: public read"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');
