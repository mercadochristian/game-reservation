-- ==========================================================================
-- Add registration_note and payment_note columns with character constraints
-- ==========================================================================
-- Adds optional notes to registrations (player-written) and registration_payments
-- (admin-written), both with max 200 character limits.
--
-- Generated: 2026-04-01
-- ==========================================================================

-- Add registration_note column to registrations table
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS registration_note TEXT;

-- Add check constraint for registration_note (max 200 chars)
ALTER TABLE public.registrations ADD CONSTRAINT registration_note_max_length
  CHECK (registration_note IS NULL OR LENGTH(registration_note) <= 200);

-- Add payment_note column to registration_payments table
ALTER TABLE public.registration_payments ADD COLUMN IF NOT EXISTS payment_note TEXT;

-- Add check constraint for payment_note (max 200 chars)
ALTER TABLE public.registration_payments ADD CONSTRAINT payment_note_max_length
  CHECK (payment_note IS NULL OR LENGTH(payment_note) <= 200);

-- ==========================================================================
-- Rollback
-- ==========================================================================
ALTER TABLE public.registration_payments DROP CONSTRAINT payment_note_max_length;
ALTER TABLE public.registration_payments DROP COLUMN payment_note;
ALTER TABLE public.registrations DROP CONSTRAINT registration_note_max_length;
ALTER TABLE public.registrations DROP COLUMN registration_note;
