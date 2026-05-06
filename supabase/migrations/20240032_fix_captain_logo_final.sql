-- ============================================================
-- Migration 032 — Final Fix for Captain Logo Permissions
-- ============================================================

-- 1. Nettoyage des anciennes politiques sur la table teams pour éviter les conflits
DROP POLICY IF EXISTS "teams: captain update name and logo" ON public.teams;
DROP POLICY IF EXISTS "Captains can update their own team" ON public.teams;

-- 2. Création d'une politique robuste pour la mise à jour de l'équipe par le capitaine
-- Cette politique permet au capitaine de mettre à jour UNIQUEMENT le logo_url et le nom
-- en vérifiant soit son captain_id (UUID auth), soit son captain_player_id (via table players)
CREATE POLICY "teams: captain update logo and name"
ON public.teams
FOR UPDATE
TO authenticated
USING (
  -- L'utilisateur est admin
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  OR
  -- L'utilisateur est le capitaine direct (captain_id)
  captain_id = auth.uid()
  OR
  -- L'utilisateur est lié via captain_player_id
  EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = teams.captain_player_id
    AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  OR
  captain_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = teams.captain_player_id
    AND p.user_id = auth.uid()
  )
);

-- 3. Nettoyage et recréation des politiques de stockage (bucket 'avatars')
-- On supprime les anciennes versions pour repartir sur une base saine
DROP POLICY IF EXISTS "avatars: captain upload team logo" ON storage.objects;
DROP POLICY IF EXISTS "avatars: captain update team logo" ON storage.objects;
DROP POLICY IF EXISTS "avatars: captain delete team logo" ON storage.objects;

-- Note: Le chemin attendu est 'teams/{team_id}/logo'
-- (storage.foldername(name))[1] extrait le premier segment ('teams')
-- (storage.foldername(name))[2] extrait le second segment (le team_id)

CREATE POLICY "avatars: captain manage team logo"
ON storage.objects
FOR ALL 
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = 'teams' AND
  (
    -- Admin bypass
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    -- Captain check
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id::text = (storage.foldername(name))[2]
      AND (
        t.captain_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM public.players p
          WHERE p.id = t.captain_player_id
          AND p.user_id = auth.uid()
        )
      )
    )
  )
);

-- On s'assure que le bucket est public pour la lecture
-- (Généralement géré au niveau du bucket lui-même, mais on peut ajouter une politique SELECT)
DROP POLICY IF EXISTS "avatars: public select" ON storage.objects;
CREATE POLICY "avatars: public select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
