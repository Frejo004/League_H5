
-- ============================================================
-- Add Fadul AGNIDE to FAGEP FC in the active season (if not already present)
-- ============================================================

WITH active_season AS (
    SELECT id AS season_id FROM public.seasons WHERE is_active = true LIMIT 1
), fagep_team AS (
    SELECT id AS team_id FROM public.teams WHERE name = 'FAGEP FC' LIMIT 1
)
INSERT INTO public.players (team_id, season_id, first_name, last_name, jersey_number, position, is_active, created_at, updated_at)
SELECT
    ft.team_id,
    asn.season_id,
    'Fadul',
    'AGNIDE',
    NULL,
    NULL,
    true,
    NOW(),
    NOW()
FROM active_season asn, fagep_team ft
WHERE NOT EXISTS (
    SELECT 1 FROM public.players p 
    WHERE p.team_id = ft.team_id 
    AND p.season_id = asn.season_id 
    AND p.first_name = 'Fadul' 
    AND p.last_name = 'AGNIDE'
);

-- Now verify he's there!
SELECT
    p.id,
    p.first_name,
    p.last_name,
    p.user_id,
    p.is_active,
    t.name AS team_name,
    s.name AS season_name
FROM public.players p
JOIN public.teams t ON p.team_id = t.id
JOIN public.seasons s ON p.season_id = s.id
WHERE t.name = 'FAGEP FC'
AND s.is_active = true
AND p.first_name = 'Fadul'
AND p.last_name = 'AGNIDE';
