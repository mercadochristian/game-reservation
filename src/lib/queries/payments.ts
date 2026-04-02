import type { SupabaseClient } from '@supabase/supabase-js'
import type { PostgrestError } from '@supabase/postgrest-js'
import type { Database } from '@/types/database'

type DbClient = SupabaseClient<Database>

/**
 * Payment record with joined registration and payer details.
 * Typed explicitly because the select includes aliased foreign keys
 * that PostgREST TS cannot infer (payer:payer_id, users:player_id).
 */
export type PaymentWithDetails = {
  id: string
  registration_id: string | null
  payer_id: string
  registration_type: string
  payment_status: string
  payment_proof_url: string | null
  extracted_amount: number | null
  extracted_reference: string | null
  extracted_datetime: string | null
  extracted_sender: string | null
  extraction_confidence: string | null
  created_at: string
  required_amount: number
  payment_note: string | null
  registrations: {
    id: string
    player_id: string
    users: { id: string; first_name: string | null; last_name: string | null } | null
  } | null
  payer: { first_name: string | null; last_name: string | null } | null
}

/**
 * Fetches all payment records for a schedule with registration and payer details.
 * Used by api/admin/payments/[id]/route.ts.
 */
export async function getPaymentsBySchedule(supabase: DbClient, scheduleId: string) {
  // Aliased foreign key joins (payer:payer_id, users:player_id) require explicit result typing
  return supabase
    .from('registration_payments')
    .select(
      `id, registration_id, payer_id, registration_type, payment_status, payment_proof_url, extracted_amount, extracted_reference,
       extracted_datetime, extracted_sender, extraction_confidence, created_at, required_amount, payment_note,
       registrations!registration_id(id, player_id, users:player_id(id, first_name, last_name)),
       payer:payer_id(first_name, last_name)`,
    )
    .eq('schedule_id', scheduleId)
    .order('created_at', { ascending: false }) as unknown as Promise<{
      data: PaymentWithDetails[] | null
      error: PostgrestError | null
    }>
}

/**
 * Fetches payment status and extracted amount for multiple schedules.
 * Used by api/admin/payments/schedules to show payment summaries.
 */
export async function getPaymentStatusBySchedules(
  supabase: DbClient,
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
  supabase: DbClient,
  data: Database['public']['Tables']['registration_payments']['Insert'],
) {
  return supabase
    .from('registration_payments')
    .insert(data)
    .select('id')
    .single()
}

// Extends the generated Update type with extraction_status, which is added by a pending
// migration (supabase/migrations/20260402000000_extraction_status.sql). Remove this
// extension and the cast below once `database.ts` is regenerated after `supabase db push`.
type PaymentUpdateData = Database['public']['Tables']['registration_payments']['Update'] & {
  extraction_status?: string | null
}

/**
 * Updates AI extraction fields on a payment record.
 * Used by api/admin/payments/[id]/edit and api/payment-proof/extract.
 */
export async function updatePaymentExtraction(
  supabase: DbClient,
  id: string,
  data: PaymentUpdateData,
) {
  return supabase
    .from('registration_payments')
    .update(data as Database['public']['Tables']['registration_payments']['Update'])
    .eq('id', id)
}

/**
 * Fetches payment fields needed for the scanner's payment-gate check.
 * Returns null if no payment record exists (maybeSingle).
 */
export async function getPaymentById(supabase: DbClient, registrationId: string) {
  return supabase.from('registration_payments')
    .select('required_amount, payment_note')
    .eq('registration_id', registrationId)
    .maybeSingle()
}
