-- ============================================================
-- Migration 033 — Fix captain logo storage policy
-- FOR ALL sans WITH CHECK ne couvre pas les INSERT.
-- On sépare en politiques INSERT + UPDATE + DELETE explicites.
-- ============================================================

-- Suppression de la politique FOR ALL qui ne couvre pas les INSERT
DROP POLICY IF EXISTS "avatars: captain manage team logo" ON storage.objects;

-- INSERT : le capitaine peut uploader le logo de son équipe
CREATE POLICY "avatars: captain insert team logo"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'teams'
  AND (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id::text = (storage.foldername(name))[2]
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

-- UPDATE : le capitaine peut remplacer le logo de son équipe
CREATE POLICY "avatars: captain update team logo"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'teams'
  AND (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id::text = (storage.foldername(name))[2]
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
  AND (storage.foldername(name))[1] = 'teams'
  AND (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id::text = (storage.foldername(name))[2]
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

-- DELETE : le capitaine peut supprimer le logo de son équipe
CREATE POLICY "avatars: captain delete team logo"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'teams'
  AND (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id::text = (storage.foldername(name))[2]
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
