
-- ============================================================
-- Helper script to list active players and their possible matching profiles
-- ============================================================

-- Step 1: Get all active players with their details
SELECT
    p.id AS player_id,
    p.first_name,
    p.last_name,
    p.team_id,
    p.user_id AS current_linked_user_id
FROM
    public.players p
JOIN
    public.seasons s ON p.season_id = s.id
WHERE
    s.is_active = TRUE
    AND p.is_active = TRUE
ORDER BY
    p.last_name, p.first_name;

-- Step 2: Get all profiles with their details
SELECT
    id AS profile_id,
    email,
    full_name,
    role
FROM
    public.profiles
ORDER BY
    full_name;
