import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type DbClient = SupabaseClient<Database>

/**
 * Fetches active payment channels for display to payers.
 * Used by api/payment-channels/route.ts.
 */
export async function getActivePaymentChannels(supabase: DbClient) {
  return supabase.from('payment_channels')
    .select('id, name, provider, account_number, account_holder_name, qr_code_url, is_active')
    .eq('is_active', true)
    .order('provider', { ascending: true })
}
