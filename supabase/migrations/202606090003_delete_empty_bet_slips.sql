-- ============================================================
-- Migration — Fonction utilitaire : supprimer les bet_slips orphelins
-- Un bet_slip est orphelin quand toutes ses sélections ont été
-- supprimées en cascade (ex: suppression des polls d'un match annulé).
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_empty_bet_slips()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.bet_slips
  WHERE id NOT IN (
    SELECT DISTINCT slip_id FROM public.bet_slip_selections
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_empty_bet_slips TO authenticated;
