-- supabase/migrations/20260403000000_add_banned_at_to_users.sql

-- Forward migration: add banned_at to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at timestamptz DEFAULT NULL;

-- Rollback:
-- ALTER TABLE users DROP COLUMN IF EXISTS banned_at;
