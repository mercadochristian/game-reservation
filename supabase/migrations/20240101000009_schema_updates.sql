-- Fix birthday constraint (year is now optional)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS chk_users_birthday_complete;

-- Replace full_name with separate first/last name columns
ALTER TABLE public.users
  DROP COLUMN IF EXISTS full_name,
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Add missing contact number column
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS player_contact_number TEXT;

-- Update handle_new_user trigger to no longer reference full_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _role public.user_role;
BEGIN
  SELECT role INTO _role FROM public.role_whitelist WHERE email = NEW.email;
  IF _role IS NULL THEN _role := 'player'; END IF;

  INSERT INTO public.users (id, email, role, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    _role,
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Activity / error logs table
CREATE TABLE IF NOT EXISTS public.logs (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  level      TEXT        NOT NULL CHECK (level IN ('info', 'warn', 'error')),
  action     TEXT        NOT NULL,
  user_id    UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  message    TEXT,
  metadata   JSONB       DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read logs"
  ON public.logs FOR SELECT TO authenticated
  USING (private.is_admin());
