-- ==========================================================================
-- Migration: Update team_preference Enum
-- ==========================================================================
-- Extends the team_preference enum to support three registration modes:
-- - shuffle: solo player, unassigned until facilitator organizes
-- - group: 2+ players together (no position requirements), pre-assigned team
-- - team: complete team with position requirements, pre-assigned team
--
-- Changes the old 'teammate' value to 'group' (no data exists yet using 'teammate')
-- ==========================================================================

-- Step 1: Remove default from column temporarily
ALTER TABLE public.registrations
  ALTER COLUMN team_preference DROP DEFAULT;

-- Step 2: Rename old type and create new one with all three values
ALTER TYPE public.team_preference RENAME TO team_preference_old;

CREATE TYPE public.team_preference AS ENUM ('shuffle', 'group', 'team');

-- Step 3: Update the registrations table column type
ALTER TABLE public.registrations
  ALTER COLUMN team_preference TYPE public.team_preference
  USING team_preference::text::public.team_preference;

-- Step 4: Re-add the default
ALTER TABLE public.registrations
  ALTER COLUMN team_preference SET DEFAULT 'shuffle'::public.team_preference;

-- Step 5: Drop the old type
DROP TYPE team_preference_old;
