import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Fetches active payment channels for display to payers.
 * Used by api/payment-channels/route.ts.
 */
export async function getActivePaymentChannels(supabase: SupabaseClient) {
  return (supabase.from('payment_channels') as any)
    .select('id, name, provider, account_number, account_holder_name, qr_code_url, is_active')
    .eq('is_active', true)
    .order('provider', { ascending: true })
}

/**
 * Fetches all payment channels ordered by creation date.
 * Used by dashboard/payment-channels/page.tsx.
 */
export async function getAllPaymentChannels(supabase: SupabaseClient) {
  return (supabase.from('payment_channels') as any)
    .select('*')
    .order('created_at', { ascending: false })
}

/**
 * Creates a new payment channel.
 */
export async function createPaymentChannel(
  supabase: SupabaseClient,
  data: Record<string, unknown>,
) {
  return (supabase.from('payment_channels') as any)
    .insert(data)
    .select('*')
    .single()
}

/**
 * Updates a payment channel by ID.
 */
export async function updatePaymentChannel(
  supabase: SupabaseClient,
  id: string,
  data: Record<string, unknown>,
) {
  return (supabase.from('payment_channels') as any)
    .update(data)
    .eq('id', id)
}

/**
 * Toggles the is_active flag on a payment channel.
 */
export async function togglePaymentChannelActive(
  supabase: SupabaseClient,
  id: string,
  isActive: boolean,
) {
  return (supabase.from('payment_channels') as any)
    .update({ is_active: isActive })
    .eq('id', id)
}

/**
 * Deletes a payment channel by ID.
 */
export async function deletePaymentChannel(supabase: SupabaseClient, id: string) {
  return (supabase.from('payment_channels') as any).delete().eq('id', id)
}
