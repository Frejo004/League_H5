-- Fonction pour créer ou remplacer une invitation de manière atomique
CREATE OR REPLACE FUNCTION public.upsert_player_invite(
  p_player_id UUID,
  p_created_by UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
BEGIN
  -- Supprimer l'ancienne invitation si elle existe
  DELETE FROM public.player_invites WHERE player_id = p_player_id;

  -- Insérer la nouvelle et récupérer le token généré par défaut
  INSERT INTO public.player_invites (player_id, created_by)
  VALUES (p_player_id, p_created_by)
  RETURNING token INTO v_token;

  RETURN v_token;
END;
$$;