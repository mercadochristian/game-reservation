-- ==========================================================================
-- Create Dummy Players via SQL
-- ==========================================================================
-- Run this directly in Supabase SQL Editor
--
-- How to use:
-- 1. Open Supabase Dashboard → SQL Editor
-- 2. Copy & paste this entire script
-- 3. Click "Run" button
--
-- This creates 6 test players with complete profiles.
-- NOTE: Auth users must be created separately via the Auth dashboard
--
-- To create auth users:
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Click "Add user" button
-- 3. Enter email (e.g., player1@test.local)
-- 4. Set password or use magic link
-- 5. Copy the UUID from the created user
-- 6. Replace the UUID in the INSERT statement below
-- ==========================================================================

-- Insert test players with complete profiles
INSERT INTO public.users (
  id,
  email,
  role,
  first_name,
  last_name,
  skill_level,
  gender,
  birthday_month,
  birthday_day,
  birthday_year,
  player_contact_number,
  emergency_contact_name,
  emergency_contact_relationship,
  emergency_contact_number,
  profile_completed,
  created_at,
  updated_at
)
VALUES
  (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'player1@test.local',
    'player',
    'Alice',
    'Johnson',
    'intermediate',
    'Female',
    3,
    15,
    1995,
    '555-0101',
    'John Johnson',
    'Brother',
    '555-0100',
    true,
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000002'::uuid,
    'player2@test.local',
    'player',
    'Bob',
    'Smith',
    'intermediate_plus',
    'Male',
    7,
    22,
    1992,
    '555-0102',
    'Sarah Smith',
    'Sister',
    '555-0103',
    true,
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000003'::uuid,
    'player3@test.local',
    'player',
    'Carol',
    'Williams',
    'advanced',
    'Female',
    11,
    8,
    1990,
    '555-0104',
    'Mike Williams',
    'Spouse',
    '555-0105',
    true,
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000004'::uuid,
    'player4@test.local',
    'player',
    'David',
    'Brown',
    'developmental_plus',
    'Male',
    1,
    30,
    1998,
    '555-0106',
    'Lisa Brown',
    'Mother',
    '555-0107',
    true,
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000005'::uuid,
    'player5@test.local',
    'player',
    'Emma',
    'Davis',
    'intermediate',
    'Female',
    5,
    12,
    1996,
    '555-0108',
    'Tom Davis',
    'Father',
    '555-0109',
    true,
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000006'::uuid,
    'player6@test.local',
    'player',
    'Frank',
    'Miller',
    'developmental',
    'Male',
    9,
    5,
    1999,
    '555-0110',
    'Nancy Miller',
    'Aunt',
    '555-0111',
    true,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  skill_level = EXCLUDED.skill_level,
  gender = EXCLUDED.gender,
  birthday_month = EXCLUDED.birthday_month,
  birthday_day = EXCLUDED.birthday_day,
  birthday_year = EXCLUDED.birthday_year,
  player_contact_number = EXCLUDED.player_contact_number,
  emergency_contact_name = EXCLUDED.emergency_contact_name,
  emergency_contact_relationship = EXCLUDED.emergency_contact_relationship,
  emergency_contact_number = EXCLUDED.emergency_contact_number,
  profile_completed = EXCLUDED.profile_completed,
  updated_at = NOW();

-- Verify creation
SELECT id, email, first_name, last_name, skill_level, profile_completed
FROM public.users
WHERE role = 'player' AND email LIKE '%test.local%'
ORDER BY created_at DESC;
