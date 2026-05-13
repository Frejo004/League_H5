-- ============================================================
-- Migration 044 — Fix captain logo storage RLS (Retry)
-- Use a more direct LIKE comparison for path
-- ============================================================

-- Drop old policies to avoid conflicts
DROP POLICY IF EXISTS "avatars: captain insert team logo" ON storage.objects;
DROP POLICY IF EXISTS "avatars: captain update team logo" ON storage.objects;
DROP POLICY IF EXISTS "avatars: captain select team logo" ON storage.objects;
DROP POLICY IF EXISTS "avatars: captain delete team logo" ON storage.objects;

-- INSERT
CREATE POLICY "avatars: captain insert team logo"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (
    -- Admin case
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    -- Captain case
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE name LIKE ('teams/' || t.id::text || '/%')
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

-- UPDATE
CREATE POLICY "avatars: captain update team logo"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE name LIKE ('teams/' || t.id::text || '/%')
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
  AND (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE name LIKE ('teams/' || t.id::text || '/%')
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

-- SELECT
CREATE POLICY "avatars: captain select team logo"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE name LIKE ('teams/' || t.id::text || '/%')
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

-- DELETE
CREATE POLICY "avatars: captain delete team logo"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE name LIKE ('teams/' || t.id::text || '/%')
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
