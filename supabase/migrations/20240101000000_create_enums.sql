-- All custom types must exist before table definitions reference them.

CREATE TYPE public.user_role AS ENUM ('admin', 'player', 'facilitator');

-- Skill levels are ordered. The order here defines the enum sort order in Postgres.
-- developmental < developmental_plus < intermediate < intermediate_plus < advanced
CREATE TYPE public.skill_level AS ENUM (
  'developmental',
  'developmental_plus',
  'intermediate',
  'intermediate_plus',
  'advanced'
);

CREATE TYPE public.schedule_status AS ENUM ('open', 'full', 'cancelled', 'completed');

CREATE TYPE public.payment_status AS ENUM ('pending', 'review', 'paid', 'rejected');

CREATE TYPE public.team_preference AS ENUM ('shuffle', 'teammate');
