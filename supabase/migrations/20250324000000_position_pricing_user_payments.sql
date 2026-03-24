-- Migration: Position-based pricing + user_payments table
-- Created: 2025-03-24
-- Purpose: Add per-position and team pricing to schedules, create separate user_payments table

-- 1. Add pricing columns to schedules
ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS position_prices jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS team_price      numeric(10, 2);

-- 2. Create user_payments table
CREATE TABLE public.user_payments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Exactly one of registration_id (solo) or team_id (group/team) is set
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

-- 3. Enable RLS on user_payments
ALTER TABLE public.user_payments ENABLE ROW LEVEL SECURITY;

-- RLS: Players view their own payments
CREATE POLICY "Players view own payments" ON public.user_payments
  FOR SELECT USING (payer_id = auth.uid());

-- RLS: Players insert their own payments
CREATE POLICY "Players insert own payments" ON public.user_payments
  FOR INSERT WITH CHECK (payer_id = auth.uid());

-- RLS: Admins manage all payments
CREATE POLICY "Admins manage all payments" ON public.user_payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- 4. Migrate existing payment data from registrations to user_payments
INSERT INTO public.user_payments (
  registration_id, payer_id, schedule_id, registration_type,
  required_amount, payment_status, payment_proof_url,
  payment_channel_id, extracted_amount, extracted_reference,
  extracted_datetime, extracted_sender, extraction_confidence, extracted_raw
)
SELECT
  r.id,
  r.registered_by,
  r.schedule_id,
  'solo',
  0,
  r.payment_status,
  r.payment_proof_url,
  r.payment_channel_id,
  r.extracted_amount,
  r.extracted_reference,
  r.extracted_datetime,
  r.extracted_sender,
  r.extraction_confidence,
  r.extracted_raw
FROM public.registrations r;

-- 5. Drop payment columns from registrations
ALTER TABLE public.registrations
  DROP COLUMN IF EXISTS payment_status,
  DROP COLUMN IF EXISTS payment_proof_url,
  DROP COLUMN IF EXISTS payment_channel_id,
  DROP COLUMN IF EXISTS extracted_amount,
  DROP COLUMN IF EXISTS extracted_reference,
  DROP COLUMN IF EXISTS extracted_datetime,
  DROP COLUMN IF EXISTS extracted_sender,
  DROP COLUMN IF EXISTS extraction_confidence,
  DROP COLUMN IF EXISTS extracted_raw;

-- 6. Create indexes on user_payments
CREATE INDEX IF NOT EXISTS idx_user_payments_registration ON public.user_payments(registration_id);
CREATE INDEX IF NOT EXISTS idx_user_payments_team         ON public.user_payments(team_id);
CREATE INDEX IF NOT EXISTS idx_user_payments_payer        ON public.user_payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_user_payments_schedule     ON public.user_payments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_user_payments_status       ON public.user_payments(payment_status);

-- 7. Add auto-update trigger for user_payments.updated_at
-- (Reuse existing trigger function if available, or create one)
CREATE TRIGGER trg_user_payments_updated_at
  BEFORE UPDATE ON public.user_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
