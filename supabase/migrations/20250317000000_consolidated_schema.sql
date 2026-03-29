-- ==========================================================================
-- Consolidated Schema — Volleyball Game Reservation System
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. Schemas & Helper Functions
-- --------------------------------------------------------------------------
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

-- --------------------------------------------------------------------------
-- 2. Enums
-- --------------------------------------------------------------------------
CREATE TYPE public.user_role AS ENUM ('admin', 'player', 'facilitator');

CREATE TYPE public.skill_level AS ENUM (
  'developmental', 'developmental_plus',
  'intermediate', 'intermediate_plus', 'advanced'
);

CREATE TYPE public.schedule_status AS ENUM ('open', 'full', 'cancelled', 'completed');
CREATE TYPE public.payment_status   AS ENUM ('pending', 'review', 'paid', 'rejected');
CREATE TYPE public.team_preference  AS ENUM ('shuffle', 'teammate');

CREATE TYPE public.player_position AS ENUM (
  'open_spiker', 'opposite_spiker', 'middle_blocker', 'setter'
);

-- --------------------------------------------------------------------------
-- 3. Tables (in FK dependency order)
-- --------------------------------------------------------------------------

-- role_whitelist: pre-approved emails get non-player roles on signup
CREATE TABLE public.role_whitelist (
  email TEXT PRIMARY KEY,
  role  public.user_role NOT NULL
);

-- users: mirrors auth.users, extended with app-level fields
CREATE TABLE public.users (
  id                             UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                          TEXT        NOT NULL UNIQUE,
  role                           public.user_role NOT NULL DEFAULT 'player',
  skill_level                    public.skill_level,
  avatar_url                     TEXT,
  first_name                     TEXT,
  last_name                      TEXT,
  gender                         TEXT,
  birthday_month                 SMALLINT,
  birthday_day                   SMALLINT,
  birthday_year                  SMALLINT,
  emergency_contact_name         TEXT,
  emergency_contact_relationship TEXT,
  emergency_contact_number       TEXT,
  player_contact_number          TEXT,
  profile_completed              BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_birthday_month      CHECK (birthday_month BETWEEN 1 AND 12),
  CONSTRAINT chk_birthday_day        CHECK (birthday_day BETWEEN 1 AND 31),
  CONSTRAINT chk_users_birthday_year CHECK (birthday_year BETWEEN 1900 AND 2030)
);

-- locations: venues where games are held
CREATE TABLE public.locations (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT        NOT NULL,
  address        TEXT,
  google_map_url TEXT,
  notes          TEXT,
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by     UUID        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- schedules: a single game session/event
CREATE TABLE public.schedules (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT        NOT NULL,
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ NOT NULL,
  location_id     UUID        NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
  max_players     INTEGER     NOT NULL CHECK (max_players > 0),
  num_teams       INTEGER     NOT NULL DEFAULT 2 CONSTRAINT chk_schedules_num_teams CHECK (num_teams >= 2),
  required_levels TEXT[]      DEFAULT ARRAY[]::TEXT[],
  status          public.schedule_status NOT NULL DEFAULT 'open',
  created_by      UUID        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_schedules_time_order CHECK (end_time > start_time)
);

-- registrations: a player's slot in a schedule
CREATE TABLE public.registrations (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id        UUID        NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  registered_by      UUID        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  player_id          UUID        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  team_preference    public.team_preference NOT NULL DEFAULT 'shuffle',
  payment_status     public.payment_status  NOT NULL DEFAULT 'pending',
  payment_proof_url  TEXT,
  attended           BOOLEAN     NOT NULL DEFAULT FALSE,
  qr_token           UUID        UNIQUE,
  preferred_position public.player_position,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (schedule_id, player_id)
);

-- teams: named teams within a schedule
CREATE TABLE public.teams (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID        NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- team_members: players assigned to teams
CREATE TABLE public.team_members (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id   UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  position  public.player_position,
  UNIQUE (team_id, player_id)
);

-- mvp_awards: post-game MVP recognition
CREATE TABLE public.mvp_awards (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID        NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  player_id   UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  awarded_by  UUID        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  note        TEXT,
  awarded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_mvp_no_self_award CHECK (awarded_by <> player_id)
);

-- logs: activity/error logs
CREATE TABLE public.logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  level      TEXT        NOT NULL CHECK (level IN ('info', 'warn', 'error')),
  action     TEXT        NOT NULL,
  user_id    UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  message    TEXT,
  metadata   JSONB       DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- 4. Indexes
-- --------------------------------------------------------------------------
CREATE INDEX idx_registrations_schedule_id ON public.registrations(schedule_id);
CREATE INDEX idx_registrations_player_id   ON public.registrations(player_id);
CREATE INDEX idx_registrations_qr_token    ON public.registrations(qr_token);
CREATE INDEX idx_registrations_pending     ON public.registrations(schedule_id)
  WHERE payment_status = 'pending';
CREATE INDEX idx_team_members_team_id      ON public.team_members(team_id);
CREATE INDEX idx_team_members_player_id    ON public.team_members(player_id);
CREATE INDEX idx_mvp_awards_schedule_id    ON public.mvp_awards(schedule_id);
CREATE INDEX idx_mvp_awards_player_id      ON public.mvp_awards(player_id);
CREATE INDEX idx_schedules_start_time      ON public.schedules(start_time);
CREATE INDEX idx_schedules_open            ON public.schedules(start_time) WHERE status = 'open';
CREATE INDEX idx_schedules_created_by      ON public.schedules(created_by);
CREATE INDEX idx_schedules_location_id     ON public.schedules(location_id);
CREATE INDEX idx_schedules_status          ON public.schedules(status);
CREATE INDEX idx_locations_is_active       ON public.locations(is_active);

-- --------------------------------------------------------------------------
-- 5. Trigger Functions & Triggers
-- --------------------------------------------------------------------------

-- Auto-update updated_at on any UPDATE
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_schedules_updated_at
  BEFORE UPDATE ON public.schedules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_registrations_updated_at
  BEFORE UPDATE ON public.registrations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_locations_updated_at
  BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-assign role from whitelist on new auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _role public.user_role;
BEGIN
  SELECT role INTO _role FROM public.role_whitelist WHERE email = NEW.email;
  IF _role IS NULL THEN _role := 'player'; END IF;
  INSERT INTO public.users (id, email, role, avatar_url)
  VALUES (NEW.id, NEW.email, _role, NEW.raw_user_meta_data ->> 'avatar_url');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-generate QR token on registration insert
CREATE OR REPLACE FUNCTION public.set_qr_token()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.qr_token IS NULL THEN
    NEW.qr_token := gen_random_uuid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_registration_insert ON public.registrations;
CREATE TRIGGER before_registration_insert
  BEFORE INSERT ON public.registrations FOR EACH ROW EXECUTE FUNCTION public.set_qr_token();

-- --------------------------------------------------------------------------
-- 6. Row Level Security
-- --------------------------------------------------------------------------
ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mvp_awards    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs          ENABLE ROW LEVEL SECURITY;

-- users
CREATE POLICY "users_select_own"                ON public.users FOR SELECT TO authenticated USING (id = (SELECT auth.uid()));
CREATE POLICY "users_select_admin"              ON public.users FOR SELECT TO authenticated USING ((SELECT private.is_admin()));
CREATE POLICY "users_select_name_authenticated" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_update_own"                ON public.users FOR UPDATE TO authenticated USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));
CREATE POLICY "users_update_admin"              ON public.users FOR UPDATE TO authenticated USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));

-- schedules
CREATE POLICY "schedules_select_public" ON public.schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "schedules_insert_admin"  ON public.schedules FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin()));
CREATE POLICY "schedules_update_admin"  ON public.schedules FOR UPDATE TO authenticated USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));
CREATE POLICY "schedules_delete_admin"  ON public.schedules FOR DELETE TO authenticated USING ((SELECT private.is_admin()));

-- registrations
CREATE POLICY "registrations_select_anon"  ON public.registrations FOR SELECT TO anon          USING (true);
CREATE POLICY "registrations_select_own"   ON public.registrations FOR SELECT TO authenticated USING (player_id = (SELECT auth.uid()) OR registered_by = (SELECT auth.uid()));
CREATE POLICY "registrations_select_admin" ON public.registrations FOR SELECT TO authenticated USING ((SELECT private.is_admin()));
CREATE POLICY "registrations_insert_own"   ON public.registrations FOR INSERT TO authenticated WITH CHECK (registered_by = (SELECT auth.uid()) AND (player_id = (SELECT auth.uid()) OR (SELECT private.is_admin())));
CREATE POLICY "registrations_update_admin" ON public.registrations FOR UPDATE TO authenticated USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));

-- teams
CREATE POLICY "teams_select_public" ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "teams_insert_admin"  ON public.teams FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin()));
CREATE POLICY "teams_update_admin"  ON public.teams FOR UPDATE TO authenticated USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));
CREATE POLICY "teams_delete_admin"  ON public.teams FOR DELETE TO authenticated USING ((SELECT private.is_admin()));

-- team_members
CREATE POLICY "team_members_select_public" ON public.team_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "team_members_insert_admin"  ON public.team_members FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin()));
CREATE POLICY "team_members_update_admin"  ON public.team_members FOR UPDATE TO authenticated USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));
CREATE POLICY "team_members_delete_admin"  ON public.team_members FOR DELETE TO authenticated USING ((SELECT private.is_admin()));

-- mvp_awards
CREATE POLICY "mvp_awards_select_public"              ON public.mvp_awards FOR SELECT TO authenticated USING (true);
CREATE POLICY "mvp_awards_insert_admin_or_facilitator" ON public.mvp_awards FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'facilitator')));
CREATE POLICY "mvp_awards_update_admin"               ON public.mvp_awards FOR UPDATE TO authenticated USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));
CREATE POLICY "mvp_awards_delete_admin"               ON public.mvp_awards FOR DELETE TO authenticated USING ((SELECT private.is_admin()));

-- role_whitelist
CREATE POLICY "role_whitelist_select_admin" ON public.role_whitelist FOR SELECT TO authenticated USING ((SELECT private.is_admin()));
CREATE POLICY "role_whitelist_insert_admin" ON public.role_whitelist FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin()));
CREATE POLICY "role_whitelist_update_admin" ON public.role_whitelist FOR UPDATE TO authenticated USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));
CREATE POLICY "role_whitelist_delete_admin" ON public.role_whitelist FOR DELETE TO authenticated USING ((SELECT private.is_admin()));

-- locations
CREATE POLICY "locations_select_public" ON public.locations FOR SELECT USING (true);
CREATE POLICY "locations_insert_admin"  ON public.locations FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin()));
CREATE POLICY "locations_update_admin"  ON public.locations FOR UPDATE TO authenticated USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));
CREATE POLICY "locations_delete_admin"  ON public.locations FOR DELETE TO authenticated USING ((SELECT private.is_admin()));

-- logs
CREATE POLICY "Admins can read logs" ON public.logs FOR SELECT TO authenticated USING ((SELECT private.is_admin()));

-- --------------------------------------------------------------------------
-- 7. Storage
-- --------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', FALSE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "payment_proofs_upload_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'payment-proofs'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "payment_proofs_read_own" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'payment-proofs'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "payment_proofs_read_admin" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'payment-proofs'
    AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "payment_proofs_delete_admin" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'payment-proofs'
    AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
