-- ==========================================================================
-- Migration: Soft Delete for Locations and Schedules
-- Issue: #38
-- ==========================================================================
-- Hard-deleting a location or schedule cascades through dependent rows
-- (schedules reference locations; registrations reference schedules) and
-- permanently destroys historical data.  Soft delete replaces the physical
-- DELETE with a tombstone timestamp, preserving all history while keeping
-- active records easy to query.
--
-- Pattern:
--   - deleted_at IS NULL  → record is active (the common case)
--   - deleted_at IS NOT NULL → record is archived (tombstoned)
--
-- Application code must:
--   - Replace hard DELETEs with:  UPDATE ... SET deleted_at = now()
--   - Always filter active records with:  .is('deleted_at', null)
--     (or use the filtered views defined in the next migration)
--
-- To restore a record:  UPDATE ... SET deleted_at = NULL
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. Add deleted_at columns
-- --------------------------------------------------------------------------

-- locations: venues can be archived instead of deleted.
-- Existing is_active flag controls visibility for new schedule creation;
-- deleted_at controls whether the row is considered to exist at all.
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.locations.deleted_at IS
  'NULL = active record.  Set to NOW() to soft-delete.  Never physically deleted.';

-- schedules: past or cancelled games must be preserved for registration
-- history, payment auditing, and attendance records.
ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.schedules.deleted_at IS
  'NULL = active record.  Set to NOW() to soft-delete.  Never physically deleted.';

-- --------------------------------------------------------------------------
-- 2. Performance index on deleted_at
-- --------------------------------------------------------------------------
-- A partial index on NULL rows is effectively free storage-wise because
-- active rows are the vast majority.  It lets the planner use an index
-- scan for the WHERE deleted_at IS NULL condition that appears in every
-- active-records query.
-- --------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_locations_active
  ON public.locations (created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_schedules_active
  ON public.schedules (start_time)
  WHERE deleted_at IS NULL;

-- --------------------------------------------------------------------------
-- 3. Data consistency check
-- --------------------------------------------------------------------------
-- Before application code enforces soft-delete, ensure there are no
-- existing orphaned registrations pointing to schedules that may have been
-- hard-deleted (should be impossible given FK constraints, but verified
-- here for safety).  This raises an exception if orphans are found.
-- --------------------------------------------------------------------------
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM public.registrations r
  WHERE NOT EXISTS (
    SELECT 1 FROM public.schedules s WHERE s.id = r.schedule_id
  );

  IF orphan_count > 0 THEN
    RAISE EXCEPTION
      'Data consistency check failed: % registration(s) reference non-existent schedules. '
      'Resolve orphaned rows before applying soft-delete migration.',
      orphan_count;
  END IF;
END;
$$;

-- --------------------------------------------------------------------------
-- 4. Update RLS policies to filter soft-deleted rows
-- --------------------------------------------------------------------------

-- ---- locations ----
-- The existing policy allows any authenticated (or anonymous) user to
-- SELECT from locations.  Update it to hide soft-deleted rows so that
-- archived venues never surface in dropdowns, registration pages, or
-- admin lists unless the admin explicitly requests the archive view
-- (see soft_delete_views migration).

DROP POLICY IF EXISTS "locations_select_public" ON public.locations;

CREATE POLICY "locations_select_public"
  ON public.locations
  FOR SELECT
  USING (deleted_at IS NULL);

-- ---- schedules ----
-- The existing policy allows any authenticated user to SELECT schedules.
-- Soft-deleted schedules should not appear in the public calendar, admin
-- schedule list, or the registration page.  Admins can access deleted
-- schedules through the archive view defined in the next migration.

DROP POLICY IF EXISTS "schedules_select_public" ON public.schedules;

CREATE POLICY "schedules_select_public"
  ON public.schedules
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- --------------------------------------------------------------------------
-- WHY SOFT DELETE?
-- --------------------------------------------------------------------------
-- 1. Audit trail: registrations, payments, and attendance records reference
--    schedule_id.  Hard-deleting a schedule would either cascade-delete all
--    those records (destroying audit history) or leave them orphaned.
-- 2. Regulatory: payment records may need to be retained for accounting.
-- 3. Recovery: admins can undo accidental deletions without a DB restore.
-- 4. Analytics: historical data (games played, attendance rates, MVP stats)
--    remains queryable even for past/cancelled events.
-- --------------------------------------------------------------------------
