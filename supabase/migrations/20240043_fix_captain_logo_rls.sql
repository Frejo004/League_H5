-- ============================================================
-- Migration 043 — Fix captain logo storage RLS
-- Use split_part for more robust path parsing
-- Ensure SELECT, INSERT, UPDATE, DELETE are all covered
-- ============================================================

-- Drop old policies to avoid conflicts
DROP POLICY IF EXISTS "avatars: captain insert team logo" ON storage.objects;
DROP POLICY IF EXISTS "avatars: captain update team logo" ON storage.objects;
DROP POLICY IF EXISTS "avatars: captain delete team logo" ON storage.objects;
DROP POLICY IF EXISTS "avatars: captain upload team logo" ON storage.objects; -- Older name

-- INSERT : Allow captains to upload their team logo
CREATE POLICY "avatars: captain insert team logo"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND split_part(name, '/', 1) = 'teams'
  AND (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id::text = split_part(name, '/', 2)
      AND (
        t.captain_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.players p
          WHERE p.id = t.captain_player_id
          AND p.user_id = auth.uid()
        )
      )
    )
  )
);

-- UPDATE : Allow captains to replace their team logo
CREATE POLICY "avatars: captain update team logo"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND split_part(name, '/', 1) = 'teams'
  AND (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id::text = split_part(name, '/', 2)
      AND (
        t.captain_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.players p
          WHERE p.id = t.captain_player_id
          AND p.user_id = auth.uid()
        )
      )
    )
  )
)
WITH CHECK (
  bucket_id = 'avatars'
  AND split_part(name, '/', 1) = 'teams'
  AND (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id::text = split_part(name, '/', 2)
      AND (
        t.captain_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.players p
          WHERE p.id = t.captain_player_id
          AND p.user_id = auth.uid()
        )
      )
    )
  )
);

-- SELECT : Ensure captains can select their own team logo objects (needed for upsert)
-- Note: There is already a public read policy, but an explicit authenticated one can help.
CREATE POLICY "avatars: captain select team logo"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND split_part(name, '/', 1) = 'teams'
  AND (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id::text = split_part(name, '/', 2)
      AND (
        t.captain_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.players p
          WHERE p.id = t.captain_player_id
          AND p.user_id = auth.uid()
        )
      )
    )
  )
);

-- DELETE : Allow captains to delete their team logo
CREATE POLICY "avatars: captain delete team logo"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND split_part(name, '/', 1) = 'teams'
  AND (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id::text = split_part(name, '/', 2)
      AND (
        t.captain_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.players p
          WHERE p.id = t.captain_player_id
          AND p.user_id = auth.uid()
        )
      )
    )
  )
);
