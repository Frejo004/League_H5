-- Système de gestion des sanctions et suspensions
-- 1. Table des suspensions
CREATE TABLE IF NOT EXISTS public.suspensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
    match_id_trigger UUID REFERENCES public.matches(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    matches_count INTEGER DEFAULT 1,
    matches_served INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour les perfs
CREATE INDEX IF NOT EXISTS idx_suspensions_player ON public.suspensions(player_id);
CREATE INDEX IF NOT EXISTS idx_suspensions_active ON public.suspensions(is_active) WHERE is_active = true;

-- 2. Fonction pour automatiser la suspension sur carton rouge
CREATE OR REPLACE FUNCTION public.handle_red_card_suspension()
RETURNS TRIGGER AS $$
DECLARE
    v_season_id UUID;
BEGIN
    IF NEW.type = 'red_card' THEN
        -- Récupérer la saison du match
        SELECT season_id INTO v_season_id FROM public.matches WHERE id = NEW.match_id;
        
        -- Insérer une suspension automatique (1 match par défaut pour un rouge)
        INSERT INTO public.suspensions (player_id, season_id, match_id_trigger, reason, matches_count)
        VALUES (NEW.player_id, v_season_id, NEW.match_id, 'Carton Rouge Direct', 1);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger sur match_events
DROP TRIGGER IF EXISTS tr_red_card_suspension ON public.match_events;
CREATE TRIGGER tr_red_card_suspension
AFTER INSERT ON public.match_events
FOR EACH ROW EXECUTE FUNCTION public.handle_red_card_suspension();

-- 4. RLS
ALTER TABLE public.suspensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Suspensions consultables par tous"
ON public.suspensions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Suspensions gérables par les admins"
ON public.suspensions FOR ALL
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
