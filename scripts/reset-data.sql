-- ==========================================================================
-- Data Reset — Truncates all application data, preserves schema
-- Run this via: psql <connection-string> -f scripts/reset-data.sql
-- Or paste into Supabase SQL Editor
-- ==========================================================================

-- Truncate all data tables.
-- CASCADE handles FK dependencies automatically.
-- RESTART IDENTITY resets any sequences.
TRUNCATE TABLE
  public.mvp_awards,
  public.team_members,
  public.teams,
  public.registrations,
  public.logs,
  public.schedules,
  public.locations,
  public.users,
  public.role_whitelist
RESTART IDENTITY CASCADE;

-- NOTE: public.users rows are removed above, but auth.users rows are NOT.
-- After running this, existing auth users will be re-inserted into public.users
-- on their next sign-in (via the handle_new_user trigger).
-- To fully reset auth users, use the Supabase dashboard or Auth admin API.
