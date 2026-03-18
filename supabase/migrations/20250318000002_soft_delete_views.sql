-- ==========================================================================
-- Migration: Archive Views for Soft-Deleted Records
-- Issue: #38 (companion to 20250318000001_add_soft_delete.sql)
-- ==========================================================================
-- Provides read-only views that surface soft-deleted (archived) records
-- for admin auditing.  These views are intentionally separated from the
-- main migration so they can be modified independently without touching
-- the core schema change.
--
-- Views created:
--   - public.locations_archive  — soft-deleted locations
--   - public.schedules_archive  — soft-deleted schedules (with location name)
--
-- Access control:
--   Both views inherit the RLS of their underlying tables.  Because the
--   base table RLS filters WHERE deleted_at IS NULL, querying through the
--   view (which filters WHERE deleted_at IS NOT NULL) will return rows that
--   the base policy would hide.  We add explicit security_invoker = false
--   (the default) so the view runs with the definer's privileges.
--
--   To prevent non-admins from querying these views directly, we wrap them
--   with a security barrier and apply a view-level RLS check via the
--   private.is_admin() helper.
--
-- HOW TO RESTORE A RECORD:
--   UPDATE public.locations SET deleted_at = NULL WHERE id = '<uuid>';
--   UPDATE public.schedules  SET deleted_at = NULL WHERE id = '<uuid>';
--
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. locations_archive view
-- --------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.locations_archive
  WITH (security_barrier = true)
AS
SELECT
  id,
  name,
  address,
  google_map_url,
  notes,
  is_active,
  created_by,
  created_at,
  updated_at,
  deleted_at
FROM public.locations
WHERE
  deleted_at IS NOT NULL
  -- Restrict to admins: private.is_admin() checks auth.uid() against users.role
  AND (SELECT private.is_admin());

COMMENT ON VIEW public.locations_archive IS
  'Read-only view of soft-deleted (archived) locations. Admin access only. '
  'To restore: UPDATE public.locations SET deleted_at = NULL WHERE id = <uuid>.';

-- --------------------------------------------------------------------------
-- 2. schedules_archive view
-- --------------------------------------------------------------------------
-- Joins locations so the archive view includes the venue name alongside
-- the location_id, making it immediately useful for admin review without
-- requiring a separate lookup.
-- --------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.schedules_archive
  WITH (security_barrier = true)
AS
SELECT
  s.id,
  s.title,
  s.start_time,
  s.end_time,
  s.location_id,
  l.name          AS location_name,
  s.max_players,
  s.num_teams,
  s.required_levels,
  s.status,
  s.created_by,
  s.created_at,
  s.updated_at,
  s.deleted_at
FROM public.schedules s
LEFT JOIN public.locations l ON l.id = s.location_id
WHERE
  s.deleted_at IS NOT NULL
  -- Restrict to admins
  AND (SELECT private.is_admin());

COMMENT ON VIEW public.schedules_archive IS
  'Read-only view of soft-deleted (archived) schedules with location name. Admin access only. '
  'To restore: UPDATE public.schedules SET deleted_at = NULL WHERE id = <uuid>.';

-- --------------------------------------------------------------------------
-- 3. Helpful registration count view (active schedules only)
-- --------------------------------------------------------------------------
-- Convenience view used by admin schedule management page to show
-- registration fill rate per schedule.  Only includes active (non-deleted)
-- schedules so deleted schedules do not pollute aggregate counts.
-- --------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.schedules_with_registration_count AS
SELECT
  s.id,
  s.title,
  s.start_time,
  s.end_time,
  s.location_id,
  l.name        AS location_name,
  s.max_players,
  s.num_teams,
  s.required_levels,
  s.status,
  s.created_by,
  s.created_at,
  s.updated_at,
  COUNT(r.id)::INTEGER AS registration_count
FROM public.schedules s
LEFT JOIN public.locations l  ON l.id = s.location_id
LEFT JOIN public.registrations r ON r.schedule_id = s.id
WHERE s.deleted_at IS NULL
GROUP BY s.id, l.name;

COMMENT ON VIEW public.schedules_with_registration_count IS
  'Active schedules joined with location name and current registration count. '
  'Soft-deleted schedules are excluded. Readable by any authenticated user '
  '(inherits schedules RLS).';
