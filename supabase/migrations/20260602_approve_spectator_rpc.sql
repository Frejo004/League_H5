-- Fonction pour approuver un spectateur et mettre à jour son profil
CREATE OR REPLACE FUNCTION public.approve_spectator(
  p_request_id UUID,
  p_admin_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- 1. Récupérer l'user_id de la demande
  SELECT user_id INTO v_user_id FROM public.spectators WHERE id = p_request_id;

  -- 2. Mettre à jour la demande
  UPDATE public.spectators 
  SET status = 'approved', 
      reviewed_at = now(), 
      reviewed_by = p_admin_id 
  WHERE id = p_request_id;

  -- 3. Mettre à jour le rôle du profil (si ce n'est pas déjà un admin/captain)
  UPDATE public.profiles 
  SET role = 'spectator' 
  WHERE id = v_user_id 
  AND role = 'visitor';
END;
$$;