-- ============================================================
-- Migration : correction auth sur claim_player_invite
-- ============================================================
-- Corrige la faille où un utilisateur non authentifié (auth.uid() = NULL)
-- contournait la vérification d'identité en appelant le RPC avec
-- un token valide, car la condition était "auth.uid() IS NOT NULL AND...".

CREATE OR REPLACE FUNCTION public.claim_player_invite(p_token text, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_player_id uuid;
  v_first_name text;
  v_last_name  text;
BEGIN
  -- Défense en profondeur : l'appel DOIT être authentifié, et l'appelant ne
  -- peut réclamer une invitation que pour son propre compte.
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Non autorisé. Vous devez être connecté avec ce compte.';
  END IF;

  -- Valider STRICTEMENT par le token secret
  SELECT inv.player_id, pl.first_name, pl.last_name
  INTO v_player_id, v_first_name, v_last_name
  FROM public.player_invites inv
  JOIN public.players pl ON pl.id = inv.player_id
  WHERE inv.token = p_token
    AND inv.used_at IS NULL
    AND inv.expires_at > now()
    AND pl.user_id IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lien d''invitation invalide ou expiré.';
  END IF;

  -- Lier l'utilisateur au joueur
  UPDATE public.players
  SET user_id = p_user_id, updated_at = now()
  WHERE id = v_player_id;

  -- Mettre à jour le profil
  UPDATE public.profiles
  SET
    role       = 'player',
    full_name  = v_first_name || ' ' || v_last_name,
    updated_at = now()
  WHERE id = p_user_id;

  -- Marquer l'invitation comme utilisée
  UPDATE public.player_invites
  SET used_at = now()
  WHERE token = p_token;
END;
$$;
