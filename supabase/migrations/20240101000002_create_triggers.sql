-- Trigger 1: handle_new_user
-- Fires AFTER INSERT on auth.users (Supabase's internal auth table).
-- Checks role_whitelist for the new user's email; falls back to 'player'.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
-- SECURITY DEFINER is required because this runs as the postgres superuser,
-- which is the only role that can INSERT into public.users referencing auth.users
-- at trigger execution time.
SET search_path = public
AS $$
DECLARE
  _role public.user_role;
BEGIN
  -- Look up the whitelist; if not found, default to 'player'
  SELECT role INTO _role
  FROM public.role_whitelist
  WHERE email = NEW.email;

  IF NOT FOUND THEN
    _role := 'player';
  END IF;

  INSERT INTO public.users (id, email, full_name, role, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    _role,
    NEW.raw_user_meta_data ->> 'avatar_url'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- Trigger 2: set_qr_token
-- Fires BEFORE INSERT on registrations.
-- Ensures qr_token is always set to a unique UUID.
CREATE OR REPLACE FUNCTION public.set_qr_token()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.qr_token IS NULL THEN
    NEW.qr_token := gen_random_uuid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_registration_insert ON public.registrations;
CREATE TRIGGER before_registration_insert
  BEFORE INSERT ON public.registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_qr_token();
