-- ============================================================
-- Migration 0002 — Limites sur les demandes de transfert
-- ============================================================
-- Un joueur ne peut pas avoir plus de 2 demandes EN ATTENTE
-- et ne peut pas faire plusieurs demandes vers la même équipe.

CREATE OR REPLACE FUNCTION public.check_transfer_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending_count INT;
  duplicate_exists BOOLEAN;
BEGIN
  IF NEW.status NOT IN (
    'player_requested',
    'home_captain_approved',
    'admin_approved'
  ) THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO pending_count
  FROM public.transfers
  WHERE player_id = NEW.player_id
    AND season_id = NEW.season_id
    AND status IN (
      'player_requested',
      'home_captain_approved',
      'admin_approved'
    );

  IF TG_OP = 'INSERT' THEN
    IF pending_count >= 2 THEN
      RAISE EXCEPTION 'LIMIT_REACHED: Un joueur ne peut pas avoir plus de 2 demandes de transfert en attente.';
    END IF;

    SELECT EXISTS(
      SELECT 1 FROM public.transfers
      WHERE player_id = NEW.player_id
        AND season_id = NEW.season_id
        AND to_team_id = NEW.to_team_id
        AND status IN (
          'player_requested',
          'home_captain_approved',
          'admin_approved'
        )
    ) INTO duplicate_exists;

    IF duplicate_exists THEN
      RAISE EXCEPTION 'DUPLICATE_TEAM: Vous avez déjà une demande en attente pour cette équipe.';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.id <> NEW.id AND pending_count >= 2 THEN
      RAISE EXCEPTION 'LIMIT_REACHED: Un joueur ne peut pas avoir plus de 2 demandes de transfert en attente.';
    END IF;

    IF OLD.id <> NEW.id THEN
      SELECT EXISTS(
        SELECT 1 FROM public.transfers
        WHERE player_id = NEW.player_id
          AND season_id = NEW.season_id
          AND to_team_id = NEW.to_team_id
          AND status IN (
            'player_requested',
            'home_captain_approved',
            'admin_approved'
          )
          AND id <> OLD.id
      ) INTO duplicate_exists;

      IF duplicate_exists THEN
        RAISE EXCEPTION 'DUPLICATE_TEAM: Vous avez déjà une demande en attente pour cette équipe.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS transfers_limits_trigger ON public.transfers;

CREATE TRIGGER transfers_limits_trigger
  BEFORE INSERT OR UPDATE ON public.transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.check_transfer_limits();
