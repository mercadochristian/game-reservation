-- users: mirrors auth.users, extended with app-level fields
CREATE TABLE public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  full_name   TEXT,
  role        public.user_role NOT NULL DEFAULT 'player',
  skill_level public.skill_level,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- role_whitelist: pre-approved emails get non-player roles on signup
CREATE TABLE public.role_whitelist (
  email TEXT PRIMARY KEY,
  role  public.user_role NOT NULL
);

-- schedules: a single game session/event
CREATE TABLE public.schedules (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT NOT NULL,
  start_time     TIMESTAMPTZ NOT NULL,
  end_time       TIMESTAMPTZ NOT NULL,
  venue          TEXT NOT NULL,
  max_players    INTEGER NOT NULL CHECK (max_players > 0),
  required_level public.skill_level,
  status         public.schedule_status NOT NULL DEFAULT 'open',
  created_by     UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- registrations: a player's registration for a specific schedule
CREATE TABLE public.registrations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id       UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  registered_by     UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  player_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  team_preference   public.team_preference NOT NULL DEFAULT 'shuffle',
  payment_status    public.payment_status NOT NULL DEFAULT 'pending',
  payment_proof_url TEXT,
  attended          BOOLEAN NOT NULL DEFAULT FALSE,
  qr_token          UUID UNIQUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- A player can only be registered once per schedule
  UNIQUE (schedule_id, player_id)
);

-- teams: named teams within a schedule
CREATE TABLE public.teams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- team_members: many-to-many between teams and players
CREATE TABLE public.team_members (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id   UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  UNIQUE (team_id, player_id)
);

-- mvp_awards: post-game MVP recognition
CREATE TABLE public.mvp_awards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  player_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  awarded_by  UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  note        TEXT,
  awarded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_registrations_schedule_id ON public.registrations(schedule_id);
CREATE INDEX idx_registrations_player_id ON public.registrations(player_id);
CREATE INDEX idx_registrations_qr_token ON public.registrations(qr_token);
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_team_members_player_id ON public.team_members(player_id);
CREATE INDEX idx_mvp_awards_schedule_id ON public.mvp_awards(schedule_id);
CREATE INDEX idx_mvp_awards_player_id ON public.mvp_awards(player_id);
