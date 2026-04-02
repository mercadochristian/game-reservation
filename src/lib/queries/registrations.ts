import type { SupabaseClient } from '@supabase/supabase-js'
import type { RegistrationInsert } from '@/types'

/**
 * Counts registrations for a schedule (head-only, no data returned).
 * Used for availability checks.
 */
export async function getRegistrationCountForSchedule(
  supabase: SupabaseClient,
  scheduleId: string,
) {
  return supabase
    .from('registrations')
    .select('*', { count: 'exact', head: true })
    .eq('schedule_id', scheduleId)
}

/**
 * Checks for duplicate registrations for given players in a schedule.
 * Returns player_id for any already-registered players.
 */
export async function checkDuplicateRegistrations(
  supabase: SupabaseClient,
  scheduleId: string,
  playerIds: string[],
) {
  return (supabase.from('registrations') as any)
    .select('player_id')
    .eq('schedule_id', scheduleId)
    .in('player_id', playerIds) as { data: Array<{ player_id: string }> | null; error: any }
}

/**
 * Batch inserts registrations and returns their IDs and player_ids.
 */
export async function createRegistrations(
  supabase: SupabaseClient,
  records: RegistrationInsert[],
) {
  return (supabase
    .from('registrations') as any)
    .insert(records)
    .select('id, player_id')
}

/**
 * Marks a registration as attended or not attended.
 */
export async function updateAttendance(
  supabase: SupabaseClient,
  registrationId: string,
  attended: boolean,
) {
  return (supabase
    .from('registrations') as any)
    .update({ attended })
    .eq('id', registrationId)
}

/**
 * Fetches all registrations for a schedule ordered by creation date.
 * Returns core fields only (no user joins).
 */
export async function getRegistrationsBySchedule(
  supabase: SupabaseClient,
  scheduleId: string,
) {
  return supabase
    .from('registrations')
    .select('id, player_id, registered_by, schedule_id, preferred_position, created_at, updated_at')
    .eq('schedule_id', scheduleId)
    .order('created_at', { ascending: false })
}

/**
 * Fetches registrations for lineup management with user and team member details.
 * Used by dashboard/lineups/[scheduleId]/page.tsx.
 */
export async function getRegistrationsForLineup(
  supabase: SupabaseClient,
  scheduleId: string,
) {
  return (supabase
    .from('registrations') as any)
    .select(`
      id, schedule_id, player_id, team_preference, preferred_position, lineup_team_id,
      users!player_id(id, first_name, last_name, skill_level, is_guest, gender),
      team_members!registration_id(team_id, teams(id, name))
    `)
    .eq('schedule_id', scheduleId)
    .order('created_at', { ascending: true })
}

/**
 * Fetches registrations with their payment status for a schedule.
 * Used by scanner routes to determine player eligibility.
 */
export async function getRegistrationsWithPayments(
  supabase: SupabaseClient,
  scheduleId: string,
) {
  return supabase
    .from('registrations')
    .select('id, player_id, attended, registration_payments(payment_status)')
    .eq('schedule_id', scheduleId)
}

/**
 * Looks up a registration by qr_token or id (maybeSingle — 0 rows is valid).
 * Used by the scanner scan route.
 */
export async function lookupRegistrationByField(
  supabase: SupabaseClient,
  field: 'qr_token' | 'id',
  value: string,
) {
  return (supabase
    .from('registrations') as any)
    .select('id, attended, schedule_id, player_id, registration_payments(payment_status)')
    .eq(field, value)
    .maybeSingle()
}

/**
 * Updates the lineup_team_id for a set of registration IDs.
 * Used by the admin lineups API route.
 */
export async function updateRegistrationLineupTeam(
  supabase: SupabaseClient,
  registrationIds: string[],
  lineupTeamId: string | null,
) {
  return (supabase
    .from('registrations') as any)
    .update({ lineup_team_id: lineupTeamId })
    .in('id', registrationIds)
}

/**
 * Fetches paginated registrations for a player (upcoming or past schedules).
 * Used by my-registrations-client.tsx.
 */
export async function getPlayerRegistrations(
  supabase: SupabaseClient,
  userId: string,
  timeFilter: 'upcoming' | 'past',
  page: number,
  pageSize: number,
) {
  const nowUtc = new Date().toISOString()
  const from = page * pageSize
  const to = from + pageSize - 1

  const query = (supabase
    .from('schedules') as any)
    .select('*, locations(*), registrations!inner(*)')
    .eq('registrations.player_id', userId)
    .order('start_time', { ascending: timeFilter === 'upcoming' })
    .range(from, to)

  if (timeFilter === 'upcoming') {
    return query.gte('start_time', nowUtc) as Promise<{ data: any[] | null; error: any }>
  } else {
    return query.lt('start_time', nowUtc) as Promise<{ data: any[] | null; error: any }>
  }
}

/**
 * Checks whether a player is already registered for a schedule.
 * Returns schedule_id if found (maybeSingle — not found is valid).
 */
export async function isPlayerRegistered(
  supabase: SupabaseClient,
  scheduleId: string,
  playerId: string,
) {
  return supabase
    .from('registrations')
    .select('schedule_id')
    .eq('player_id', playerId)
    .eq('schedule_id', scheduleId)
    .maybeSingle()
}

/**
 * Counts recent registrations (last 5 by created_at).
 * Used by the admin dashboard for activity stats.
 */
export async function getRecentRegistrationsCount(supabase: SupabaseClient) {
  return supabase
    .from('registrations')
    .select('*', { count: 'exact', head: true })
    .order('created_at', { ascending: false })
    .limit(5)
}
