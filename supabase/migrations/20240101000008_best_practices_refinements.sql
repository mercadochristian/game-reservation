-- ============================================================================
-- Best Practices Refinements: RLS Security, Data Integrity, Timestamps, Indexes
-- ============================================================================

-- ============================================================================
-- 1. RLS SECURITY: Private schema + is_admin() helper
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  );
END;
$$;

-- ============================================================================
-- 2. RLS SECURITY: Drop and recreate all policies
-- ============================================================================

-- --- users
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_select_admin" ON public.users;
DROP POLICY IF EXISTS "users_update_admin" ON public.users;

CREATE POLICY "users_select_own" ON public.users
  FOR SELECT TO authenticated USING (id = (SELECT auth.uid()));

CREATE POLICY "users_select_admin" ON public.users
  FOR SELECT TO authenticated USING ((SELECT private.is_admin()));

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "users_update_admin" ON public.users
  FOR UPDATE TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));

-- --- schedules
DROP POLICY IF EXISTS "schedules_select_public" ON public.schedules;
DROP POLICY IF EXISTS "schedules_insert_admin" ON public.schedules;
DROP POLICY IF EXISTS "schedules_update_admin" ON public.schedules;
DROP POLICY IF EXISTS "schedules_delete_admin" ON public.schedules;

CREATE POLICY "schedules_select_public" ON public.schedules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "schedules_insert_admin" ON public.schedules
  FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "schedules_update_admin" ON public.schedules
  FOR UPDATE TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "schedules_delete_admin" ON public.schedules
  FOR DELETE TO authenticated USING ((SELECT private.is_admin()));

-- --- registrations
DROP POLICY IF EXISTS "registrations_select_own" ON public.registrations;
DROP POLICY IF EXISTS "registrations_select_admin" ON public.registrations;
DROP POLICY IF EXISTS "registrations_insert_own" ON public.registrations;
DROP POLICY IF EXISTS "registrations_update_admin" ON public.registrations;

CREATE POLICY "registrations_select_own" ON public.registrations
  FOR SELECT TO authenticated
  USING (player_id = (SELECT auth.uid()) OR registered_by = (SELECT auth.uid()));

CREATE POLICY "registrations_select_admin" ON public.registrations
  FOR SELECT TO authenticated USING ((SELECT private.is_admin()));

CREATE POLICY "registrations_insert_own" ON public.registrations
  FOR INSERT TO authenticated
  WITH CHECK (
    registered_by = (SELECT auth.uid())
    AND (player_id = (SELECT auth.uid()) OR (SELECT private.is_admin()))
  );

CREATE POLICY "registrations_update_admin" ON public.registrations
  FOR UPDATE TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));

-- --- teams
DROP POLICY IF EXISTS "teams_select_public" ON public.teams;
DROP POLICY IF EXISTS "teams_insert_admin" ON public.teams;
DROP POLICY IF EXISTS "teams_update_admin" ON public.teams;
DROP POLICY IF EXISTS "teams_delete_admin" ON public.teams;

CREATE POLICY "teams_select_public" ON public.teams
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "teams_insert_admin" ON public.teams
  FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "teams_update_admin" ON public.teams
  FOR UPDATE TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "teams_delete_admin" ON public.teams
  FOR DELETE TO authenticated USING ((SELECT private.is_admin()));

-- --- team_members
DROP POLICY IF EXISTS "team_members_select_public" ON public.team_members;
DROP POLICY IF EXISTS "team_members_insert_admin" ON public.team_members;
DROP POLICY IF EXISTS "team_members_update_admin" ON public.team_members;
DROP POLICY IF EXISTS "team_members_delete_admin" ON public.team_members;

CREATE POLICY "team_members_select_public" ON public.team_members
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "team_members_insert_admin" ON public.team_members
  FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "team_members_update_admin" ON public.team_members
  FOR UPDATE TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "team_members_delete_admin" ON public.team_members
  FOR DELETE TO authenticated USING ((SELECT private.is_admin()));

-- --- mvp_awards
DROP POLICY IF EXISTS "mvp_awards_select_public" ON public.mvp_awards;
DROP POLICY IF EXISTS "mvp_awards_insert_admin_or_facilitator" ON public.mvp_awards;
DROP POLICY IF EXISTS "mvp_awards_update_admin" ON public.mvp_awards;
DROP POLICY IF EXISTS "mvp_awards_delete_admin" ON public.mvp_awards;

CREATE POLICY "mvp_awards_select_public" ON public.mvp_awards
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "mvp_awards_insert_admin_or_facilitator" ON public.mvp_awards
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'facilitator')
    )
  );

CREATE POLICY "mvp_awards_update_admin" ON public.mvp_awards
  FOR UPDATE TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "mvp_awards_delete_admin" ON public.mvp_awards
  FOR DELETE TO authenticated USING ((SELECT private.is_admin()));

-- --- role_whitelist
DROP POLICY IF EXISTS "role_whitelist_select_admin" ON public.role_whitelist;
DROP POLICY IF EXISTS "role_whitelist_insert_admin" ON public.role_whitelist;
DROP POLICY IF EXISTS "role_whitelist_update_admin" ON public.role_whitelist;
DROP POLICY IF EXISTS "role_whitelist_delete_admin" ON public.role_whitelist;

CREATE POLICY "role_whitelist_select_admin" ON public.role_whitelist
  FOR SELECT TO authenticated USING ((SELECT private.is_admin()));

CREATE POLICY "role_whitelist_insert_admin" ON public.role_whitelist
  FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "role_whitelist_update_admin" ON public.role_whitelist
  FOR UPDATE TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "role_whitelist_delete_admin" ON public.role_whitelist
  FOR DELETE TO authenticated USING ((SELECT private.is_admin()));

-- --- locations
DROP POLICY IF EXISTS "locations_select_public" ON public.locations;
DROP POLICY IF EXISTS "locations_insert_admin" ON public.locations;
DROP POLICY IF EXISTS "locations_update_admin" ON public.locations;
DROP POLICY IF EXISTS "locations_delete_admin" ON public.locations;

CREATE POLICY "locations_select_public" ON public.locations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "locations_insert_admin" ON public.locations
  FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "locations_update_admin" ON public.locations
  FOR UPDATE TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "locations_delete_admin" ON public.locations
  FOR DELETE TO authenticated USING ((SELECT private.is_admin()));

-- ============================================================================
-- 3. DATA INTEGRITY: Constraints
-- ============================================================================

-- schedules: end time must be after start time
ALTER TABLE public.schedules
  ADD CONSTRAINT chk_schedules_time_order CHECK (end_time > start_time);

-- users: birthday year must be in a reasonable range
ALTER TABLE public.users
  ADD CONSTRAINT chk_users_birthday_year CHECK (birthday_year BETWEEN 1900 AND 2030);

-- users: all three birthday fields must be set together, or all NULL (no partial state)
ALTER TABLE public.users
  ADD CONSTRAINT chk_users_birthday_complete CHECK (
    (birthday_month IS NULL) = (birthday_day IS NULL)
    AND (birthday_month IS NULL) = (birthday_year IS NULL)
  );

-- mvp_awards: awarded_by cannot be the same as player_id (no self-awards)
ALTER TABLE public.mvp_awards
  ADD CONSTRAINT chk_mvp_no_self_award CHECK (awarded_by <> player_id);

-- ============================================================================
-- 4. TIMESTAMPS: updated_at columns + trigger
-- ============================================================================

-- Trigger function: auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- users
ALTER TABLE public.users ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- schedules
ALTER TABLE public.schedules ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TRIGGER trg_schedules_updated_at
  BEFORE UPDATE ON public.schedules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- registrations
ALTER TABLE public.registrations ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TRIGGER trg_registrations_updated_at
  BEFORE UPDATE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- locations
ALTER TABLE public.locations ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TRIGGER trg_locations_updated_at
  BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 5. INDEXES: Performance optimization
-- ============================================================================

-- schedules: time-based filtering (players browsing upcoming games)
CREATE INDEX idx_schedules_start_time ON public.schedules (start_time);

-- schedules: partial index for open games (most common player query)
CREATE INDEX idx_schedules_open ON public.schedules (start_time)
  WHERE status = 'open';

-- schedules: created_by filtering (admin managing their own schedules)
CREATE INDEX idx_schedules_created_by ON public.schedules (created_by);

-- registrations: pending payment review (admin workflow)
CREATE INDEX idx_registrations_pending ON public.registrations (schedule_id)
  WHERE payment_status = 'pending';
