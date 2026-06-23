-- ============================================================
-- Migration — news-images storage bucket + RLS policies
-- Bucket public pour les images des articles d'actualité
-- Seuls les admins peuvent uploader/modifier/supprimer
-- Lecture publique pour affichage côté joueurs
-- ============================================================

-- Création du bucket (public = les URLs fonctionnent sans auth)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'news-images',
  'news-images',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Lecture publique
create policy "news-images: public read"
  on storage.objects for select
  to public
  using (bucket_id = 'news-images');

-- Upload : admin seulement
create policy "news-images: admin upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'news-images'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Modification : admin seulement
create policy "news-images: admin update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'news-images'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    bucket_id = 'news-images'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Suppression : admin seulement
create policy "news-images: admin delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'news-images'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
