-- ==========================================================================
-- Add extraction_status to registration_payments
-- ==========================================================================
-- NULL  = extraction not attempted (feature disabled at time of registration)
-- pending = extraction triggered, awaiting result
-- done    = extraction completed successfully
-- failed  = extraction attempted and failed (storage error, Claude API error)
-- ==========================================================================

ALTER TABLE public.registration_payments
ADD COLUMN IF NOT EXISTS extraction_status TEXT
  CHECK (extraction_status IN ('pending', 'done', 'failed'));

-- ==========================================================================
-- ROLLBACK:
-- ALTER TABLE public.registration_payments DROP COLUMN IF EXISTS extraction_status;
-- ==========================================================================
