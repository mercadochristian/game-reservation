-- ==========================================================================
-- Migration: Database Performance Indices
-- Issue: #39
-- ==========================================================================
-- Adds indices for columns that are frequently used in WHERE clauses, JOIN
-- conditions, and ORDER BY operations. These become important as the
-- registrations and users tables grow.
--
-- NOTE: users.email already has an implicit unique B-tree index from its
-- UNIQUE constraint — no additional index is needed for exact-match lookups.
-- What we add here are indices optimised for the actual query patterns used
-- in the application (ILIKE searches, enum-filtered aggregates, etc.).
-- ==========================================================================

-- --------------------------------------------------------------------------
-- Enable pg_trgm extension
-- --------------------------------------------------------------------------
-- Required for GIN trigram indices which power case-insensitive substring
-- searches (ILIKE '%query%') efficiently.  Creating it with IF NOT EXISTS
-- is safe to run on any Supabase project where it may already be enabled.
-- --------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- --------------------------------------------------------------------------
-- users — name search index
-- --------------------------------------------------------------------------
-- Used by: GET /api/users/search?q=... (ILIKE on first_name, last_name, email)
-- Without this index, every search does a full sequential scan of users.
-- A GIN trigram index lets PostgreSQL efficiently evaluate ILIKE '%term%'
-- queries on text columns.
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_first_name_trgm
  ON public.users USING GIN (first_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_users_last_name_trgm
  ON public.users USING GIN (last_name gin_trgm_ops);

-- --------------------------------------------------------------------------
-- registrations — preferred_position filter
-- --------------------------------------------------------------------------
-- Used by: position count queries in PublicCalendar and PositionModal.
-- These queries group by preferred_position per schedule to show "X setters
-- registered" etc. Without an index, every position-count query scans the
-- entire registrations table.
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_registrations_preferred_position
  ON public.registrations (preferred_position);

-- --------------------------------------------------------------------------
-- registrations — composite (schedule_id, preferred_position)
-- --------------------------------------------------------------------------
-- Used by: grouped position count queries that filter on a specific schedule
-- and aggregate by position (e.g. PublicCalendar fetching position counts
-- for all visible schedules in the current month).
-- A composite index satisfies both the equality filter and the grouping key
-- in a single index scan — much faster than the single-column index above
-- when both columns appear in the query.
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_registrations_schedule_position
  ON public.registrations (schedule_id, preferred_position);

-- --------------------------------------------------------------------------
-- users — role filter
-- --------------------------------------------------------------------------
-- Used by: admin queries that list all players/facilitators (role = 'player').
-- Low-cardinality but still useful when the users table is large, because
-- it allows index-only scans for role-filtered counts and listings.
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_role
  ON public.users (role);
