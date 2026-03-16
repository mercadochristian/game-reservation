-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mvp_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_whitelist ENABLE ROW LEVEL SECURITY;

----------------------------------------------------------------------
-- users table
----------------------------------------------------------------------
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "users_select_admin" ON public.users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

CREATE POLICY "users_update_admin" ON public.users
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

----------------------------------------------------------------------
-- schedules table
----------------------------------------------------------------------
CREATE POLICY "schedules_select_all" ON public.schedules
  FOR SELECT USING (TRUE);

CREATE POLICY "schedules_insert_admin" ON public.schedules
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "schedules_update_admin" ON public.schedules
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "schedules_delete_admin" ON public.schedules
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

----------------------------------------------------------------------
-- registrations table
----------------------------------------------------------------------
CREATE POLICY "registrations_select_own" ON public.registrations
  FOR SELECT USING (player_id = auth.uid() OR registered_by = auth.uid());

CREATE POLICY "registrations_select_admin" ON public.registrations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "registrations_insert_own" ON public.registrations
  FOR INSERT WITH CHECK (
    registered_by = auth.uid()
    AND (
      player_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    )
  );

CREATE POLICY "registrations_update_admin" ON public.registrations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

----------------------------------------------------------------------
-- teams table
----------------------------------------------------------------------
CREATE POLICY "teams_select_all" ON public.teams
  FOR SELECT USING (TRUE);

CREATE POLICY "teams_insert_admin" ON public.teams
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "teams_update_admin" ON public.teams
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "teams_delete_admin" ON public.teams
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

----------------------------------------------------------------------
-- team_members table
----------------------------------------------------------------------
CREATE POLICY "team_members_select_all" ON public.team_members
  FOR SELECT USING (TRUE);

CREATE POLICY "team_members_insert_admin" ON public.team_members
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "team_members_update_admin" ON public.team_members
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "team_members_delete_admin" ON public.team_members
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

----------------------------------------------------------------------
-- mvp_awards table
----------------------------------------------------------------------
CREATE POLICY "mvp_awards_select_all" ON public.mvp_awards
  FOR SELECT USING (TRUE);

CREATE POLICY "mvp_awards_insert_admin_or_facilitator" ON public.mvp_awards
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'facilitator')
    )
  );

----------------------------------------------------------------------
-- role_whitelist table
----------------------------------------------------------------------
CREATE POLICY "role_whitelist_admin_only" ON public.role_whitelist
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
