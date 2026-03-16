-- Add onboarding profile columns to users table
ALTER TABLE public.users
  ADD COLUMN birthday_month SMALLINT,
  ADD COLUMN birthday_day SMALLINT,
  ADD COLUMN birthday_year SMALLINT,
  ADD COLUMN gender TEXT,
  ADD COLUMN emergency_contact_name TEXT,
  ADD COLUMN emergency_contact_relationship TEXT,
  ADD COLUMN emergency_contact_number TEXT,
  ADD COLUMN profile_completed BOOLEAN NOT NULL DEFAULT FALSE;

-- Add check constraints on birthday ranges
ALTER TABLE public.users
  ADD CONSTRAINT chk_birthday_month CHECK (birthday_month BETWEEN 1 AND 12),
  ADD CONSTRAINT chk_birthday_day CHECK (birthday_day BETWEEN 1 AND 31);
