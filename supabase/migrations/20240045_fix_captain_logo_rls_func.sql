-- ============================================================
-- Migration 045 — Fix captain logo storage RLS (Function version)
-- Use a security definer function to bypass RLS issues during check
-- ============================================================

-- Function to check if a user is a captain of a team
CREATE OR REPLACE FUNCTION public.can_manage_team_storage(p_name text, p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_team_id_text text;
BEGIN
  -- Extract team UUID from path (teams/UUID/logo)
  v_team_id_text := split_part(p_name, '/', 2);
  
  -- Check if user is admin
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id AND role = 'admin') THEN
    RETURN TRUE;
  END IF;

  -- Check if user is captain of this specific team
  RETURN EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id::text = v_team_id_text
    AND (
      t.captain_id = p_user_id
      OR EXISTS (
        SELECT 1 FROM public.players p
        WHERE p.id = t.captain_player_id
        AND p.user_id = p_user_id
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old policies
DROP POLICY IF EXISTS "avatars: captain insert team logo" ON storage.objects;
DROP POLICY IF EXISTS "avatars: captain update team logo" ON storage.objects;
DROP POLICY IF EXISTS "avatars: captain select team logo" ON storage.objects;
DROP POLICY IF EXISTS "avatars: captain delete team logo" ON storage.objects;

-- Re-implement using the function
CREATE POLICY "avatars: captain insert team logo"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND split_part(name, '/', 1) = 'teams'
  AND public.can_manage_team_storage(name, auth.uid())
);

CREATE POLICY "avatars: captain update team logo"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND split_part(name, '/', 1) = 'teams'
  AND public.can_manage_team_storage(name, auth.uid())
)
WITH CHECK (
  bucket_id = 'avatars'
  AND split_part(name, '/', 1) = 'teams'
  AND public.can_manage_team_storage(name, auth.uid())
);

CREATE POLICY "avatars: captain select team logo"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'avatars'
  AND split_part(name, '/', 1) = 'teams'
  AND public.can_manage_team_storage(name, auth.uid())
);

CREATE POLICY "avatars: captain delete team logo"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND split_part(name, '/', 1) = 'teams'
  AND public.can_manage_team_storage(name, auth.uid())
);
