-- Migration: Payment Channels + AI Extraction Fields
-- Created: 2025-03-19
-- Purpose: Add payment channels management and AI-extracted payment data fields

-- 1. Create payment_channels table
CREATE TABLE public.payment_channels (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,              -- e.g. "GCash - Main"
  provider    text NOT NULL,              -- e.g. "GCash", "Maya", "BPI"
  account_number text NOT NULL,           -- mobile number or bank account
  account_holder_name text NOT NULL,
  qr_code_url text,                       -- Storage path in 'payment-qrcodes' bucket
  is_active   boolean NOT NULL DEFAULT true,
  created_by  uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_channels ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins and super_admins can manage payment channels
CREATE POLICY "Admins can manage payment channels"
  ON public.payment_channels
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- RLS Policy: Players can view active payment channels
CREATE POLICY "Players can view active payment channels"
  ON public.payment_channels
  FOR SELECT
  USING (is_active = true);

-- 2. Add AI-extracted payment fields to registrations table
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS payment_channel_id   uuid REFERENCES public.payment_channels(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS extracted_amount      numeric(10, 2),
  ADD COLUMN IF NOT EXISTS extracted_reference   text,
  ADD COLUMN IF NOT EXISTS extracted_datetime    timestamptz,
  ADD COLUMN IF NOT EXISTS extracted_sender      text,
  ADD COLUMN IF NOT EXISTS extraction_confidence text,  -- 'high' | 'medium' | 'low' | 'failed'
  ADD COLUMN IF NOT EXISTS extracted_raw         jsonb;

-- 3. Create index on payment_channels for queries by is_active
CREATE INDEX IF NOT EXISTS idx_payment_channels_is_active
  ON public.payment_channels(is_active);

-- 4. Create index on registrations for queries by payment_status (used in payments review)
CREATE INDEX IF NOT EXISTS idx_registrations_payment_status
  ON public.registrations(payment_status);

-- 5. Create composite index for fast payment review queries
CREATE INDEX IF NOT EXISTS idx_registrations_schedule_status
  ON public.registrations(schedule_id, payment_status);
