-- ==========================================================================
-- Migration: Group Registration Support (Scenario 3)
-- ==========================================================================
-- Adds support for registering multiple players (existing users or guests)
-- for a single schedule in one flow.
--
-- Changes:
-- 1. Add is_guest column to users table to mark stub guest accounts
-- 2. Update registrations RLS policy to allow players to register others
-- ==========================================================================

-- Add is_guest column to users table
-- Marks stub accounts created on behalf of guest players
ALTER TABLE public.users
ADD COLUMN is_guest BOOLEAN NOT NULL DEFAULT FALSE;

-- Update the registrations insert RLS policy to allow group registration
-- Old policy: registered_by = auth.uid() AND (player_id = auth.uid() OR is_admin())
-- New policy: registered_by = auth.uid() (without player_id restriction for players)
DROP POLICY "registrations_insert_own" ON public.registrations;

CREATE POLICY "registrations_insert_own"
  ON public.registrations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    registered_by = (SELECT auth.uid())
  );
