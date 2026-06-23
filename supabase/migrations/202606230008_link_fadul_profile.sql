
-- ============================================================
-- Link Fadul AGNIDE's player profile to his user account
-- ============================================================

-- Step 1: Update the player's user_id
UPDATE public.players 
SET user_id = (SELECT id FROM public.profiles WHERE email = 'mohamedagnide07@gmail.com' LIMIT 1), 
    updated_at = now()
WHERE first_name = 'Fadul' AND last_name = 'AGNIDE';

-- Step 2: Verify the result
SELECT
    p.id AS player_id,
    p.first_name,
    p.last_name,
    p.user_id,
    pr.email
FROM
    public.players p
LEFT JOIN
    public.profiles pr ON pr.id = p.user_id
WHERE
    p.first_name = 'Fadul' AND p.last_name = 'AGNIDE';
