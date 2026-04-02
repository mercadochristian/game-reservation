import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type DbClient = SupabaseClient<Database>

/**
 * Fetches a schedule's fields needed for group/team registration validation.
 * Used by api/register/group.
 */
export async function getScheduleForRegistration(supabase: DbClient, id: string) {
  return supabase
    .from('schedules')
    .select('start_time, status, max_players, position_prices, team_price')
    .eq('id', id)
    .single()
}

/**
 * Fetches a schedule's pricing fields for admin registration.
 * Used by api/admin/register.
 */
export async function getSchedulePricing(supabase: DbClient, id: string) {
  return supabase
    .from('schedules')
    .select('position_prices, team_price')
    .eq('id', id)
    .single()
}
