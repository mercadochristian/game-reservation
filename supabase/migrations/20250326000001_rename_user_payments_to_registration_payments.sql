-- Migration: Position-based pricing + registration_payments table
-- Created: 2025-03-26
-- Purpose: Add pricing columns to schedules and ensure registration_payments table exists
-- Handles both fresh migrations and existing user_payments table renames

-- 1. Add pricing columns to schedules (if not already present)
ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS position_prices jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS team_price      numeric(10, 2);

-- 2. Handle table: rename if user_payments exists, otherwise create registration_payments
DO $$
BEGIN
  -- Check if user_payments table exists and rename it
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_payments' AND table_schema = 'public') THEN
    ALTER TABLE public.user_payments RENAME TO registration_payments;
  -- Otherwise create registration_payments if it doesn't exist
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'registration_payments' AND table_schema = 'public') THEN
    CREATE TABLE public.registration_payments (
      id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      registration_id       uuid REFERENCES public.registrations(id) ON DELETE CASCADE,
      team_id               uuid REFERENCES public.teams(id) ON DELETE CASCADE,
      payer_id              uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
      schedule_id           uuid NOT NULL REFERENCES public.schedules(id) ON DELETE RESTRICT,
      registration_type     text NOT NULL CHECK (registration_type IN ('solo', 'group', 'team')),
      required_amount       numeric(10, 2) NOT NULL DEFAULT 0,
      payment_status        text NOT NULL DEFAULT 'pending'
                              CHECK (payment_status IN ('pending', 'review', 'paid', 'rejected')),
      payment_proof_url     text,
      payment_channel_id    uuid REFERENCES public.payment_channels(id) ON DELETE SET NULL,
      extracted_amount      numeric(10, 2),
      extracted_reference   text,
      extracted_datetime    timestamptz,
      extracted_sender      text,
      extraction_confidence text,
      extracted_raw         jsonb,
      created_at            timestamptz NOT NULL DEFAULT now(),
      updated_at            timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT chk_payment_ref CHECK (registration_id IS NOT NULL OR team_id IS NOT NULL)
    );
    ALTER TABLE public.registration_payments ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- 3. Create RLS policies (if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'registration_payments' AND policyname = 'Players view own payments') THEN
    CREATE POLICY "Players view own payments" ON public.registration_payments
      FOR SELECT USING (payer_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'registration_payments' AND policyname = 'Players insert own payments') THEN
    CREATE POLICY "Players insert own payments" ON public.registration_payments
      FOR INSERT WITH CHECK (payer_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'registration_payments' AND policyname = 'Admins manage all payments') THEN
    CREATE POLICY "Admins manage all payments" ON public.registration_payments
      FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
      );
  END IF;
END $$;

-- 4. Rename trigger (if it exists from old user_payments)
DO $$
BEGIN
  BEGIN
    ALTER TRIGGER trg_user_payments_updated_at ON public.registration_payments
      RENAME TO trg_registration_payments_updated_at;
  EXCEPTION WHEN undefined_object THEN
    NULL; -- Trigger doesn't exist, skip
  END;
END $$;

-- 5. Rename indexes (if they exist from old user_payments)
ALTER INDEX IF EXISTS idx_user_payments_registration RENAME TO idx_registration_payments_registration;
ALTER INDEX IF EXISTS idx_user_payments_team RENAME TO idx_registration_payments_team;
ALTER INDEX IF EXISTS idx_user_payments_payer RENAME TO idx_registration_payments_payer;
ALTER INDEX IF EXISTS idx_user_payments_schedule RENAME TO idx_registration_payments_schedule;
ALTER INDEX IF EXISTS idx_user_payments_status RENAME TO idx_registration_payments_status;

-- 6. Create indexes (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_registration_payments_registration ON public.registration_payments(registration_id);
CREATE INDEX IF NOT EXISTS idx_registration_payments_team ON public.registration_payments(team_id);
CREATE INDEX IF NOT EXISTS idx_registration_payments_payer ON public.registration_payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_registration_payments_schedule ON public.registration_payments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_registration_payments_status ON public.registration_payments(payment_status);

-- 7. Create or recreate trigger for updated_at
DROP TRIGGER IF EXISTS trg_registration_payments_updated_at ON public.registration_payments;
CREATE TRIGGER trg_registration_payments_updated_at
  BEFORE UPDATE ON public.registration_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
