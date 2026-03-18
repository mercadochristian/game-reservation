-- ==========================================================================
-- Seed Script — Create dummy player data
-- ==========================================================================
-- Inserts test player profiles directly into public.users table.
-- NOTE: Auth users must already exist in auth.users (create via Supabase dashboard)
--
-- Usage:
--   1. Create dummy auth users via Supabase dashboard (Auth > Users > Add User)
--   2. Note their UUIDs
--   3. Replace the UUIDs below in the INSERT statements
--   4. Run this script via psql or Supabase SQL Editor
--
-- Alternatively, use the TypeScript seed script instead:
--   npx ts-node scripts/seed-players.ts
-- ==========================================================================

-- Insert test player data
-- Replace the UUID values with actual UUIDs from auth.users
INSERT INTO public.users (
  id, email, role, first_name, last_name, skill_level, gender,
  birthday_month, birthday_day, birthday_year,
  player_contact_number, emergency_contact_name, emergency_contact_relationship,
  emergency_contact_number, profile_completed, created_at, updated_at
) VALUES
  ('11111111-1111-1111-1111-111111111111', 'player1@test.local', 'player', 'Alice', 'Johnson', 'intermediate', 'Female', 3, 15, 1995, '555-0101', 'John Johnson', 'Brother', '555-0100', true, NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111112', 'player2@test.local', 'player', 'Bob', 'Smith', 'intermediate_plus', 'Male', 7, 22, 1992, '555-0102', 'Sarah Smith', 'Sister', '555-0103', true, NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111113', 'player3@test.local', 'player', 'Carol', 'Williams', 'advanced', 'Female', 11, 8, 1990, '555-0104', 'Mike Williams', 'Spouse', '555-0105', true, NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111114', 'player4@test.local', 'player', 'David', 'Brown', 'developmental_plus', 'Male', 1, 30, 1998, '555-0106', 'Lisa Brown', 'Mother', '555-0107', true, NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111115', 'player5@test.local', 'player', 'Emma', 'Davis', 'intermediate', 'Female', 5, 12, 1996, '555-0108', 'Tom Davis', 'Father', '555-0109', true, NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111116', 'player6@test.local', 'player', 'Frank', 'Miller', 'developmental', 'Male', 9, 5, 1999, '555-0110', 'Nancy Miller', 'Aunt', '555-0111', true, NOW(), NOW())
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
