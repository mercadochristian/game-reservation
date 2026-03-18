-- ==========================================================================
-- Migration: Link team_members to registrations
-- ==========================================================================
-- Adds a registration_id foreign key to team_members table to enable
-- PostgREST relationship expansion in queries like:
--   registrations.select('*, team_members(...)')
--
-- This allows admin registrations page to fetch team assignments with
-- the correct relationship path.
-- ==========================================================================

-- Add registration_id FK to team_members
ALTER TABLE public.team_members
ADD COLUMN registration_id UUID REFERENCES public.registrations(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX idx_team_members_registration_id ON public.team_members(registration_id);

-- Backfill existing team_members by joining through teams and registrations
-- This assumes: team -> schedule, registration -> schedule + player
UPDATE public.team_members tm
SET registration_id = r.id
FROM public.registrations r
WHERE r.player_id = tm.player_id
  AND r.schedule_id = (
    SELECT schedule_id FROM public.teams WHERE id = tm.team_id
  );

-- Make registration_id NOT NULL for new records
ALTER TABLE public.team_members
ALTER COLUMN registration_id SET NOT NULL;
