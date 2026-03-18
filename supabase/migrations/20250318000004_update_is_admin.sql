-- Update is_admin() to include super_admin (so all existing admin RLS policies work)
-- This is in a separate migration to allow the enum value to be committed first
CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role IN ('admin', 'super_admin')
  FROM public.users WHERE id = auth.uid()
$$;
