import type { SupabaseClient } from '@supabase/supabase-js'
import type { PostgrestError } from '@supabase/postgrest-js'

/**
 * Fetches all payment records for a schedule with registration and payer details.
 * Used by api/admin/payments/[id]/route.ts.
 */
export async function getPaymentsBySchedule(supabase: SupabaseClient, scheduleId: string) {
  return (supabase
    .from('registration_payments') as any)
    .select(
      `id, registration_id, payer_id, registration_type, payment_status, payment_proof_url, extracted_amount, extracted_reference,
       extracted_datetime, extracted_sender, extraction_confidence, created_at, required_amount, payment_note,
       registrations!registration_id(id, player_id, users:player_id(id, first_name, last_name)),
       payer:payer_id(first_name, last_name)`,
    )
    .eq('schedule_id', scheduleId)
    .order('created_at', { ascending: false })
}

/**
 * Fetches payment status and extracted amount for multiple schedules.
 * Used by api/admin/payments/schedules to show payment summaries.
 */
export async function getPaymentStatusBySchedules(
  supabase: SupabaseClient,
  scheduleIds: string[],
) {
  return supabase
    .from('registration_payments')
    .select('schedule_id, payment_status, extracted_amount')
    .in('schedule_id', scheduleIds)
}

/**
 * Creates a payment record and returns its ID.
 */
export async function createPayment(
  supabase: SupabaseClient,
  data: Record<string, unknown>,
) {
  return (supabase
    .from('registration_payments') as any)
    .insert(data)
    .select('id')
    .single()
}

/**
 * Updates AI extraction fields on a payment record.
 * Used by api/admin/payments/[id]/edit.
 */
export async function updatePaymentExtraction(
  supabase: SupabaseClient,
  id: string,
  data: Record<string, unknown>,
) {
  return (supabase
    .from('registration_payments') as any)
    .update(data)
    .eq('id', id)
}

/**
 * Fetches payment fields needed for the scanner's payment-gate check.
 * Returns null if no payment record exists (maybeSingle).
 */
export async function getPaymentById(supabase: SupabaseClient, registrationId: string) {
  return (supabase.from('registration_payments') as any)
    .select('required_amount, payment_note')
    .eq('registration_id', registrationId)
    .maybeSingle() as { data: { required_amount: number; payment_note: string | null } | null; error: PostgrestError | null }
}

