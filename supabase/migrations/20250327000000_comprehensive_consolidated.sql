-- ==========================================================================
-- Comprehensive Consolidated Schema — Volleyball Game Reservation System
-- ==========================================================================
-- This migration consolidates all prior migrations into a single source of truth.
--
-- For fresh deployments: apply only this migration.
-- For existing deployments: this is idempotent and will skip already-created objects.
--
-- Generated: 2025-03-27
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
    WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super_admin')
  );
END;
$$;

-- Auto-update updated_at on any UPDATE
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Alias for backward compatibility with old migration that references update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- --------------------------------------------------------------------------
-- 2. Enums
-- --------------------------------------------------------------------------
CREATE TYPE IF NOT EXISTS public.user_role AS ENUM ('admin', 'player', 'facilitator', 'super_admin');

CREATE TYPE IF NOT EXISTS public.skill_level AS ENUM (
  'developmental', 'developmental_plus',
  'intermediate', 'intermediate_plus', 'advanced'
);

CREATE TYPE IF NOT EXISTS public.schedule_status AS ENUM ('open', 'full', 'cancelled', 'completed');
CREATE TYPE IF NOT EXISTS public.payment_status AS ENUM ('pending', 'review', 'paid', 'rejected');
CREATE TYPE IF NOT EXISTS public.team_preference AS ENUM ('shuffle', 'group', 'team');

CREATE TYPE IF NOT EXISTS public.player_position AS ENUM (
  'open_spiker', 'opposite_spiker', 'middle_blocker', 'setter'
);

-- --------------------------------------------------------------------------
-- 3. Tables (in FK dependency order)
-- --------------------------------------------------------------------------

-- role_whitelist: pre-approved emails get non-player roles on signup
CREATE TABLE IF NOT EXISTS public.role_whitelist (
  email TEXT PRIMARY KEY,
  role  public.user_role NOT NULL
);

-- users: mirrors auth.users, extended with app-level fields
CREATE TABLE IF NOT EXISTS public.users (
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
  is_guest                       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_birthday_month      CHECK (birthday_month BETWEEN 1 AND 12),
  CONSTRAINT chk_birthday_day        CHECK (birthday_day BETWEEN 1 AND 31),
  CONSTRAINT chk_users_birthday_year CHECK (birthday_year BETWEEN 1900 AND 2030)
);

-- locations: venues where games are held
CREATE TABLE IF NOT EXISTS public.locations (
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
CREATE TABLE IF NOT EXISTS public.schedules (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT        NOT NULL,
  start_time        TIMESTAMPTZ NOT NULL,
  end_time          TIMESTAMPTZ NOT NULL,
  location_id       UUID        NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
  max_players       INTEGER     NOT NULL CHECK (max_players > 0),
  num_teams         INTEGER     NOT NULL DEFAULT 2 CONSTRAINT chk_schedules_num_teams CHECK (num_teams >= 2),
  required_levels   TEXT[]      DEFAULT ARRAY[]::TEXT[],
  status            public.schedule_status NOT NULL DEFAULT 'open',
  position_prices   JSONB       DEFAULT '{}'::JSONB,
  team_price        NUMERIC(10, 2),
  created_by        UUID        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_schedules_time_order CHECK (end_time > start_time)
);

-- registrations: a player's slot in a schedule
CREATE TABLE IF NOT EXISTS public.registrations (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id            UUID        NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  registered_by          UUID        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  player_id              UUID        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  team_preference        public.team_preference NOT NULL DEFAULT 'shuffle',
  payment_status         public.payment_status NOT NULL DEFAULT 'pending',
  payment_proof_url      TEXT,
  attended               BOOLEAN     NOT NULL DEFAULT FALSE,
  qr_token               UUID        UNIQUE,
  preferred_position     public.player_position,
  lineup_team_id         UUID        REFERENCES public.teams(id) ON DELETE SET NULL,
  payment_channel_id     UUID,  -- will add FK after payment_channels table exists
  extracted_amount       NUMERIC(10, 2),
  extracted_reference    TEXT,
  extracted_datetime     TIMESTAMPTZ,
  extracted_sender       TEXT,
  extraction_confidence  TEXT,
  extracted_raw          JSONB,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (schedule_id, player_id)
);

-- teams: named teams within a schedule
CREATE TABLE IF NOT EXISTS public.teams (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID        NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  team_type   TEXT        NOT NULL DEFAULT 'registration' CHECK (team_type IN ('registration', 'lineup')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- team_members: players assigned to teams
CREATE TABLE IF NOT EXISTS public.team_members (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id           UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  position          public.player_position,
  registration_id   UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  UNIQUE (team_id, player_id)
);

-- payment_channels: methods for paying for games
CREATE TABLE IF NOT EXISTS public.payment_channels (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT        NOT NULL,
  provider            TEXT        NOT NULL,
  account_number      TEXT        NOT NULL,
  account_holder_name TEXT        NOT NULL,
  qr_code_url         TEXT,
  is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by          UUID        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK from registrations to payment_channels
ALTER TABLE public.registrations
ADD CONSTRAINT fk_registrations_payment_channel_id
  FOREIGN KEY (payment_channel_id) REFERENCES public.payment_channels(id) ON DELETE SET NULL;

-- registration_payments: tracks payments for registrations and team fees
CREATE TABLE IF NOT EXISTS public.registration_payments (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id       UUID        REFERENCES public.registrations(id) ON DELETE CASCADE,
  team_id               UUID        REFERENCES public.teams(id) ON DELETE CASCADE,
  payer_id              UUID        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  schedule_id           UUID        NOT NULL REFERENCES public.schedules(id) ON DELETE RESTRICT,
  registration_type     TEXT        NOT NULL CHECK (registration_type IN ('solo', 'group', 'team')),
  required_amount       NUMERIC(10, 2) NOT NULL DEFAULT 0,
  payment_status        TEXT        NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'review', 'paid', 'rejected')),
  payment_proof_url     TEXT,
  payment_channel_id    UUID        REFERENCES public.payment_channels(id) ON DELETE SET NULL,
  extracted_amount      NUMERIC(10, 2),
  extracted_reference   TEXT,
  extracted_datetime    TIMESTAMPTZ,
  extracted_sender      TEXT,
  extraction_confidence TEXT,
  extracted_raw         JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_payment_ref CHECK (registration_id IS NOT NULL OR team_id IS NOT NULL)
);

-- mvp_awards: post-game MVP recognition
CREATE TABLE IF NOT EXISTS public.mvp_awards (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID        NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  player_id   UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  awarded_by  UUID        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  note        TEXT,
  awarded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_mvp_no_self_award CHECK (awarded_by <> player_id)
);

-- logs: activity/error logs
CREATE TABLE IF NOT EXISTS public.logs (
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
CREATE INDEX IF NOT EXISTS idx_registrations_schedule_id ON public.registrations(schedule_id);
CREATE INDEX IF NOT EXISTS idx_registrations_player_id ON public.registrations(player_id);
CREATE INDEX IF NOT EXISTS idx_registrations_qr_token ON public.registrations(qr_token);
CREATE INDEX IF NOT EXISTS idx_registrations_pending ON public.registrations(schedule_id)
  WHERE payment_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_registrations_payment_status ON public.registrations(payment_status);
CREATE INDEX IF NOT EXISTS idx_registrations_lineup_team_id ON public.registrations(lineup_team_id);

CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_player_id ON public.team_members(player_id);
CREATE INDEX IF NOT EXISTS idx_team_members_registration_id ON public.team_members(registration_id);

CREATE INDEX IF NOT EXISTS idx_mvp_awards_schedule_id ON public.mvp_awards(schedule_id);
CREATE INDEX IF NOT EXISTS idx_mvp_awards_player_id ON public.mvp_awards(player_id);

CREATE INDEX IF NOT EXISTS idx_schedules_start_time ON public.schedules(start_time);
CREATE INDEX IF NOT EXISTS idx_schedules_open ON public.schedules(start_time) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_schedules_created_by ON public.schedules(created_by);
CREATE INDEX IF NOT EXISTS idx_schedules_location_id ON public.schedules(location_id);
CREATE INDEX IF NOT EXISTS idx_schedules_status ON public.schedules(status);

CREATE INDEX IF NOT EXISTS idx_locations_is_active ON public.locations(is_active);

CREATE INDEX IF NOT EXISTS idx_payment_channels_is_active ON public.payment_channels(is_active);

CREATE INDEX IF NOT EXISTS idx_registration_payments_registration ON public.registration_payments(registration_id);
CREATE INDEX IF NOT EXISTS idx_registration_payments_team ON public.registration_payments(team_id);
CREATE INDEX IF NOT EXISTS idx_registration_payments_payer ON public.registration_payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_registration_payments_schedule ON public.registration_payments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_registration_payments_status ON public.registration_payments(payment_status);

CREATE INDEX IF NOT EXISTS idx_logs_created_at ON public.logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_level ON public.logs(level);

CREATE INDEX IF NOT EXISTS idx_teams_schedule_type ON public.teams(schedule_id, team_type);

-- --------------------------------------------------------------------------
-- 5. Trigger Functions & Triggers
-- --------------------------------------------------------------------------

CREATE TRIGGER IF NOT EXISTS trg_users_updated_at
  BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER IF NOT EXISTS trg_schedules_updated_at
  BEFORE UPDATE ON public.schedules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER IF NOT EXISTS trg_registrations_updated_at
  BEFORE UPDATE ON public.registrations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER IF NOT EXISTS trg_locations_updated_at
  BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER IF NOT EXISTS trg_payment_channels_updated_at
  BEFORE UPDATE ON public.payment_channels FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER IF NOT EXISTS trg_registration_payments_updated_at
  BEFORE UPDATE ON public.registration_payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

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
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mvp_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_payments ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_select_admin" ON public.users;
DROP POLICY IF EXISTS "users_select_name_authenticated" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_update_admin" ON public.users;
DROP POLICY IF EXISTS "schedules_select_public" ON public.schedules;
DROP POLICY IF EXISTS "schedules_insert_admin" ON public.schedules;
DROP POLICY IF EXISTS "schedules_update_admin" ON public.schedules;
DROP POLICY IF EXISTS "schedules_delete_admin" ON public.schedules;
DROP POLICY IF EXISTS "registrations_select_anon" ON public.registrations;
DROP POLICY IF EXISTS "registrations_select_own" ON public.registrations;
DROP POLICY IF EXISTS "registrations_select_admin" ON public.registrations;
DROP POLICY IF EXISTS "registrations_insert_own" ON public.registrations;
DROP POLICY IF EXISTS "registrations_update_admin" ON public.registrations;
DROP POLICY IF EXISTS "teams_select_public" ON public.teams;
DROP POLICY IF EXISTS "teams_insert_admin" ON public.teams;
DROP POLICY IF EXISTS "teams_update_admin" ON public.teams;
DROP POLICY IF EXISTS "teams_delete_admin" ON public.teams;
DROP POLICY IF EXISTS "team_members_select_public" ON public.team_members;
DROP POLICY IF EXISTS "team_members_insert_admin" ON public.team_members;
DROP POLICY IF EXISTS "team_members_update_admin" ON public.team_members;
DROP POLICY IF EXISTS "team_members_delete_admin" ON public.team_members;
DROP POLICY IF EXISTS "mvp_awards_select_public" ON public.mvp_awards;
DROP POLICY IF EXISTS "mvp_awards_insert_admin_or_facilitator" ON public.mvp_awards;
DROP POLICY IF EXISTS "mvp_awards_update_admin" ON public.mvp_awards;
DROP POLICY IF EXISTS "mvp_awards_delete_admin" ON public.mvp_awards;
DROP POLICY IF EXISTS "role_whitelist_select_admin" ON public.role_whitelist;
DROP POLICY IF EXISTS "role_whitelist_insert_admin" ON public.role_whitelist;
DROP POLICY IF EXISTS "role_whitelist_update_admin" ON public.role_whitelist;
DROP POLICY IF EXISTS "role_whitelist_delete_admin" ON public.role_whitelist;
DROP POLICY IF EXISTS "locations_select_public" ON public.locations;
DROP POLICY IF EXISTS "locations_insert_admin" ON public.locations;
DROP POLICY IF EXISTS "locations_update_admin" ON public.locations;
DROP POLICY IF EXISTS "locations_delete_admin" ON public.locations;
DROP POLICY IF EXISTS "Admins can read logs" ON public.logs;
DROP POLICY IF EXISTS "Admins can manage payment channels" ON public.payment_channels;
DROP POLICY IF EXISTS "Players can view active payment channels" ON public.payment_channels;
DROP POLICY IF EXISTS "Players view own payments" ON public.registration_payments;
DROP POLICY IF EXISTS "Players insert own payments" ON public.registration_payments;
DROP POLICY IF EXISTS "Admins manage all payments" ON public.registration_payments;

-- users
CREATE POLICY "users_select_own"
  ON public.users FOR SELECT TO authenticated USING (id = (SELECT auth.uid()));
CREATE POLICY "users_select_admin"
  ON public.users FOR SELECT TO authenticated USING ((SELECT private.is_admin()));
CREATE POLICY "users_select_name_authenticated"
  ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE TO authenticated USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));
CREATE POLICY "users_update_admin"
  ON public.users FOR UPDATE TO authenticated USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));

-- schedules
CREATE POLICY "schedules_select_public"
  ON public.schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "schedules_insert_admin"
  ON public.schedules FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin()));
CREATE POLICY "schedules_update_admin"
  ON public.schedules FOR UPDATE TO authenticated USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));
CREATE POLICY "schedules_delete_admin"
  ON public.schedules FOR DELETE TO authenticated USING ((SELECT private.is_admin()));

-- registrations
CREATE POLICY "registrations_select_anon"
  ON public.registrations FOR SELECT TO anon USING (true);
CREATE POLICY "registrations_select_own"
  ON public.registrations FOR SELECT TO authenticated USING (player_id = (SELECT auth.uid()) OR registered_by = (SELECT auth.uid()));
CREATE POLICY "registrations_select_admin"
  ON public.registrations FOR SELECT TO authenticated USING ((SELECT private.is_admin()));
CREATE POLICY "registrations_insert_own"
  ON public.registrations FOR INSERT TO authenticated WITH CHECK (registered_by = (SELECT auth.uid()));
CREATE POLICY "registrations_update_admin"
  ON public.registrations FOR UPDATE TO authenticated USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));

-- teams
CREATE POLICY "teams_select_public"
  ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "teams_insert_admin"
  ON public.teams FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin()));
CREATE POLICY "teams_update_admin"
  ON public.teams FOR UPDATE TO authenticated USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));
CREATE POLICY "teams_delete_admin"
  ON public.teams FOR DELETE TO authenticated USING ((SELECT private.is_admin()));

-- team_members
CREATE POLICY "team_members_select_public"
  ON public.team_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "team_members_insert_admin"
  ON public.team_members FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin()));
CREATE POLICY "team_members_update_admin"
  ON public.team_members FOR UPDATE TO authenticated USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));
CREATE POLICY "team_members_delete_admin"
  ON public.team_members FOR DELETE TO authenticated USING ((SELECT private.is_admin()));

-- mvp_awards
CREATE POLICY "mvp_awards_select_public"
  ON public.mvp_awards FOR SELECT TO authenticated USING (true);
CREATE POLICY "mvp_awards_insert_admin_or_facilitator"
  ON public.mvp_awards FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'facilitator', 'super_admin')));
CREATE POLICY "mvp_awards_update_admin"
  ON public.mvp_awards FOR UPDATE TO authenticated USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));
CREATE POLICY "mvp_awards_delete_admin"
  ON public.mvp_awards FOR DELETE TO authenticated USING ((SELECT private.is_admin()));

-- role_whitelist
CREATE POLICY "role_whitelist_select_admin"
  ON public.role_whitelist FOR SELECT TO authenticated USING ((SELECT private.is_admin()));
CREATE POLICY "role_whitelist_insert_admin"
  ON public.role_whitelist FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin()));
CREATE POLICY "role_whitelist_update_admin"
  ON public.role_whitelist FOR UPDATE TO authenticated USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));
CREATE POLICY "role_whitelist_delete_admin"
  ON public.role_whitelist FOR DELETE TO authenticated USING ((SELECT private.is_admin()));

-- locations
CREATE POLICY "locations_select_public"
  ON public.locations FOR SELECT USING (true);
CREATE POLICY "locations_insert_admin"
  ON public.locations FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin()));
CREATE POLICY "locations_update_admin"
  ON public.locations FOR UPDATE TO authenticated USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));
CREATE POLICY "locations_delete_admin"
  ON public.locations FOR DELETE TO authenticated USING ((SELECT private.is_admin()));

-- payment_channels
CREATE POLICY "Admins can manage payment channels"
  ON public.payment_channels FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );
CREATE POLICY "Players can view active payment channels"
  ON public.payment_channels FOR SELECT USING (is_active = true);

-- registration_payments
CREATE POLICY "Players view own payments"
  ON public.registration_payments FOR SELECT USING (payer_id = auth.uid());
CREATE POLICY "Players insert own payments"
  ON public.registration_payments FOR INSERT WITH CHECK (payer_id = auth.uid());
CREATE POLICY "Admins manage all payments"
  ON public.registration_payments FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- logs
CREATE POLICY "Admins can read logs"
  ON public.logs FOR SELECT TO authenticated USING ((SELECT private.is_admin()));

-- --------------------------------------------------------------------------
-- 7. Storage
-- --------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', FALSE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-qrcodes', 'payment-qrcodes', FALSE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "payment_proofs_upload_own" ON storage.objects;
DROP POLICY IF EXISTS "payment_proofs_read_own" ON storage.objects;
DROP POLICY IF EXISTS "payment_proofs_read_admin" ON storage.objects;
DROP POLICY IF EXISTS "payment_proofs_delete_admin" ON storage.objects;

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
    AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "payment_proofs_delete_admin" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'payment-proofs'
    AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );
