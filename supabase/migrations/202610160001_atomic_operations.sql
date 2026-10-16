-- ============================================================
-- Migration — Opérations critiques atomiques (Transactions ACID)
-- 1. Annulation de match et nettoyage en cascade atomique
-- 2. Finalisation de transfert et transfert d'équipe atomique
-- ============================================================

-- ── 1. Annulation et nettoyage atomique d'un match ──────────
CREATE OR REPLACE FUNCTION public.cancel_match_and_cleanup(
  p_match_id UUID,
  p_delete_data BOOLEAN DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Si suppression des données de match demandée
  IF p_delete_data THEN
    -- Supprimer les sondages du match (cascade vers predictions et sélections)
    DELETE FROM public.polls WHERE match_id = p_match_id;

    -- Supprimer les bet slips orphelins (s'il en reste)
    DELETE FROM public.bet_slips
    WHERE id NOT IN (
      SELECT DISTINCT slip_id FROM public.bet_slip_selections
    );

    -- Supprimer les données de jeu associées
    DELETE FROM public.goals WHERE match_id = p_match_id;
    DELETE FROM public.assists WHERE match_id = p_match_id;
    DELETE FROM public.match_events WHERE match_id = p_match_id;
    DELETE FROM public.mvp_votes WHERE match_id = p_match_id;
    DELETE FROM public.match_feedback WHERE match_id = p_match_id;
  END IF;

  -- 2. Réinitialiser et annuler le match
  UPDATE public.matches
  SET
    status = 'cancelled',
    home_score = NULL,
    away_score = NULL,
    scheduled_at = NULL,
    played_at = NULL,
    events_reporter_id = NULL,
    video_reporter_id = NULL
  WHERE id = p_match_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_match_and_cleanup(UUID, BOOLEAN) TO authenticated;

-- ── 2. Finalisation atomique de transfert d'équipe ──────────
CREATE OR REPLACE FUNCTION public.complete_transfer(
  p_transfer_id UUID
)
RETURNS public.transfers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer public.transfers;
BEGIN
  -- 1. Valider et marquer le transfert comme completed
  UPDATE public.transfers
  SET
    status = 'completed',
    away_captain_approved_by = auth.uid(),
    away_captain_approved_at = NOW(),
    decided_by = auth.uid(),
    decided_at = NOW()
  WHERE id = p_transfer_id
  RETURNING * INTO v_transfer;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfert introuvable ou non modifiable';
  END IF;

  -- 2. Déplacer le joueur vers sa nouvelle équipe de façon atomique
  UPDATE public.players
  SET team_id = v_transfer.to_team_id
  WHERE id = v_transfer.player_id;

  RETURN v_transfer;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_transfer(UUID) TO authenticated;
