
-- ============================================================
-- SINGLE SCRIPT TO FIX EVERYTHING FOR FADUL AGNIDE
-- ============================================================

-- Step 1: Link Fadul's user account to his player profile
UPDATE public.players 
SET user_id = (SELECT id FROM public.profiles WHERE email = 'mohamedagnide07@gmail.com' LIMIT 1), 
    updated_at = now()
WHERE first_name = 'Fadul' 
  AND last_name = 'AGNIDE'
  AND season_id = (SELECT id FROM public.seasons WHERE is_active = true LIMIT 1);

-- Step 2: Verify it worked!
SELECT
    p.id AS player_id,
    p.first_name,
    p.last_name,
    p.user_id,
    pr.email,
    t.name AS team_name
FROM public.players p
LEFT JOIN public.profiles pr ON pr.id = p.user_id
LEFT JOIN public.teams t ON p.team_id = t.id
WHERE p.first_name = 'Fadul' AND p.last_name = 'AGNIDE';
