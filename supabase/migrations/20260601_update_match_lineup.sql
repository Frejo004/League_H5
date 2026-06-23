-- Fonction pour mettre à jour la composition d'une équipe de manière atomique
CREATE OR REPLACE FUNCTION public.update_match_lineup(
  p_match_id UUID,
  p_team_id UUID,
  p_players JSONB -- Tableau d'objets: [{player_id: "...", is_starter: true, position: "..."}]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player JSONB;
BEGIN
  -- 1. Supprimer l'ancienne composition pour ce match et cette équipe
  DELETE FROM public.match_lineups 
  WHERE match_id = p_match_id AND team_id = p_team_id;

  -- 2. Insérer les nouveaux joueurs en récupérant leur numéro de maillot actuel
  FOR v_player IN SELECT * FROM jsonb_array_elements(p_players)
  LOOP
    INSERT INTO public.match_lineups (
      match_id,
      team_id,
      player_id,
      is_starter,
      position,
      jersey_number
    )
    SELECT 
      p_match_id,
      p_team_id,
      (v_player->>'player_id')::UUID,
      (v_player->>'is_starter')::BOOLEAN,
      v_player->>'position',
      p.jersey_number
    FROM public.players p
    WHERE p.id = (v_player->>'player_id')::UUID;
  END LOOP;
END;
$$;