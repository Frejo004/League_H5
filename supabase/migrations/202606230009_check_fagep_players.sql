
-- ============================================================
-- Check all players on FAGEP FC in active season
-- ============================================================

-- Step 1: Find active season
SELECT id AS active_season_id, name AS season_name
FROM public.seasons
WHERE is_active = true
LIMIT 1;

-- Step 2: Find FAGEP FC's team ID
SELECT id AS team_id, name AS team_name
FROM public.teams
WHERE name = 'FAGEP FC'
LIMIT 1;

-- Step 3: Get ALL players (active and inactive) on FAGEP FC in active season
SELECT
    p.id,
    p.first_name,
    p.last_name,
    p.user_id,
    p.is_active,
    p.team_id
FROM public.players p
JOIN public.seasons s ON p.season_id = s.id
JOIN public.teams t ON p.team_id = t.id
WHERE s.is_active = true
AND t.name = 'FAGEP FC'
ORDER BY p.last_name, p.first_name;
