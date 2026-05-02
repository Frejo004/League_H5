-- ============================================================
-- Migration 015 — avatars storage bucket + RLS policies
-- ============================================================

-- Create the bucket (public so avatar URLs work without auth)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152, -- 2 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Users can upload/update their own avatar (path must start with their user id)
create policy "avatars: own upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.filename(name) like auth.uid()::text || '.%'
         or name like auth.uid()::text || '/%')
  );

create policy "avatars: own update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.filename(name) like auth.uid()::text || '.%'
         or name like auth.uid()::text || '/%')
  );

create policy "avatars: own delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.filename(name) like auth.uid()::text || '.%'
         or name like auth.uid()::text || '/%')
  );

-- Public read (bucket is public, but explicit policy for clarity)
create policy "avatars: public read"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');
