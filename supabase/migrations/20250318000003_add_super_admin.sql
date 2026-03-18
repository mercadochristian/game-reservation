-- Add super_admin to the user_role enum
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'super_admin';

-- Add indexes for logs table filtering and performance
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON public.logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_level ON public.logs(level);
