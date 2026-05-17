-- Migration: Supporter l'inscription par slug de joueur pour des URLs propres
-- Date: 2026-05-17
-- Description: Met à jour get_invite_player et claim_player_invite pour accepter soit un token, soit le slug du joueur

CREATE OR REPLACE FUNCTION public.get_invite_player(p_token text)
RETURNS TABLE (
  player_id   uuid,
  first_name  text,
  last_name   text,
  team_name   text,
  is_valid    boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN query
  SELECT
    pl.id          as player_id,
    pl.first_name,
    pl.last_name,
    t.name         as team_name,
    (
      inv.used_at IS NULL
      AND inv.expires_at > now()
      AND pl.user_id IS NULL
    )              as is_valid
  FROM public.player_invites inv
  JOIN public.players pl ON pl.id = inv.player_id
  JOIN public.teams   t  ON t.id  = pl.team_id
  WHERE inv.token = p_token OR pl.slug = p_token
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_player_invite(p_token text, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_player_id uuid;
  v_first_name text;
  v_last_name  text;
BEGIN
  -- Valider par token ou par slug de joueur
  SELECT inv.player_id, pl.first_name, pl.last_name
  INTO v_player_id, v_first_name, v_last_name
  FROM public.player_invites inv
  JOIN public.players pl ON pl.id = inv.player_id
  WHERE (inv.token = p_token OR pl.slug = p_token)
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
  WHERE token = p_token OR player_id = v_player_id;
END;
$$;
