import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Fetches a schedule by ID with location and registration count.
 * Used by the register/[scheduleId]/page.tsx server component.
 */
export async function getScheduleById(supabase: SupabaseClient, id: string) {
  return (supabase
    .from('schedules') as any)
    .select('*, locations(id, name, address, google_map_url), registrations(count)')
    .eq('id', id)
    .single()
}

/**
 * Fetches a schedule's fields needed for group/team registration validation.
 * Used by api/register/group.
 */
export async function getScheduleForRegistration(supabase: SupabaseClient, id: string) {
  return (supabase
    .from('schedules') as any)
    .select('start_time, status, max_players, position_prices, team_price')
    .eq('id', id)
    .single()
}

/**
 * Fetches a schedule's pricing fields for admin registration.
 * Used by api/admin/register.
 */
export async function getSchedulePricing(supabase: SupabaseClient, id: string) {
  return (supabase
    .from('schedules') as any)
    .select('position_prices, team_price')
    .eq('id', id)
    .single()
}

/**
 * Fetches schedules for the public home page (open/full/completed, with location and registrations).
 */
export async function getSchedulesForHome(supabase: SupabaseClient) {
  return (supabase
    .from('schedules') as any)
    .select('*, locations(id, name, address, google_map_url), registrations(id, preferred_position)')
    .in('status', ['open', 'full', 'completed'])
    .order('start_time', { ascending: true })
}

/**
 * Fetches schedules with locations, optionally filtered by locationId and date range.
 * Used by dashboard/schedules, admin/payments/schedules, and scanner routes.
 */
export async function getSchedulesWithLocations(
  supabase: SupabaseClient,
  options?: {
    locationId?: string
    startGte?: string
    startLte?: string
    ascending?: boolean
    selectOverride?: string
  },
) {
  const select = options?.selectOverride ?? '*, locations(id, name, address, google_map_url)'
  let query = (supabase.from('schedules') as any).select(select)

  if (options?.locationId) {
    query = query.eq('location_id', options.locationId)
  }
  if (options?.startGte) {
    query = query.gte('start_time', options.startGte)
  }
  if (options?.startLte) {
    query = query.lte('start_time', options.startLte)
  }

  return query.order('start_time', { ascending: options?.ascending ?? false })
}

/**
 * Fetches a schedule's core fields needed for lineup management.
 * Used by dashboard/lineups/[scheduleId]/page.tsx.
 */
export async function getScheduleForLineup(supabase: SupabaseClient, scheduleId: string) {
  return (supabase
    .from('schedules') as any)
    .select('id, num_teams, start_time, end_time, locations!inner(id, name, address, google_map_url)')
    .eq('id', scheduleId)
    .single()
}

/**
 * Creates a new schedule and returns the row with location data.
 */
export async function createSchedule(supabase: SupabaseClient, data: Record<string, unknown>) {
  return (supabase
    .from('schedules') as any)
    .insert(data)
    .select('*, locations(id, name, address, google_map_url)')
    .single()
}

/**
 * Updates a schedule by ID.
 */
export async function updateSchedule(
  supabase: SupabaseClient,
  id: string,
  data: Record<string, unknown>,
) {
  return (supabase
    .from('schedules') as any)
    .update(data)
    .eq('id', id)
    .select('*, locations(id, name, address, google_map_url)')
    .single()
}

/**
 * Deletes a schedule by ID.
 */
export async function deleteSchedule(supabase: SupabaseClient, id: string) {
  return (supabase.from('schedules') as any).delete().eq('id', id)
}
