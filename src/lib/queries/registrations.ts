import type { SupabaseClient } from '@supabase/supabase-js'
import type { PostgrestError } from '@supabase/postgrest-js'
import type { Database, Json } from '@/types/database'
import type { RegistrationInsert } from '@/types'

type DbClient = SupabaseClient<Database>

/**
 * Counts registrations for a schedule (head-only, no data returned).
 * Used for availability checks.
 */
export async function getRegistrationCountForSchedule(
  supabase: DbClient,
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
  supabase: DbClient,
  scheduleId: string,
  playerIds: string[],
) {
  return supabase.from('registrations')
    .select('player_id')
    .eq('schedule_id', scheduleId)
    .in('player_id', playerIds)
}

/**
 * Batch inserts registrations and returns their IDs and player_ids.
 */
export async function createRegistrations(
  supabase: DbClient,
  records: RegistrationInsert[],
) {
  return supabase
    .from('registrations')
    .insert(records)
    .select('id, player_id')
}

/**
 * Fetches all registrations for a schedule ordered by creation date.
 * Returns core fields only (no user joins).
 */
export async function getRegistrationsBySchedule(
  supabase: DbClient,
  scheduleId: string,
) {
  return supabase
    .from('registrations')
    .select('id, player_id, registered_by, schedule_id, preferred_position, registration_note, created_at, updated_at')
    .eq('schedule_id', scheduleId)
    .order('created_at', { ascending: false })
}

/**
 * Fetches registrations with their payment status for a schedule.
 * Used by scanner routes to determine player eligibility.
 */
export async function getRegistrationsWithPayments(
  supabase: DbClient,
  scheduleId: string,
) {
  return supabase
    .from('registrations')
    .select('id, player_id, attended, registration_payments(payment_status)')
    .eq('schedule_id', scheduleId)
}

/**
 * Updates the lineup_team_id for a set of registration IDs.
 * Used by the admin lineups API route.
 */
export async function updateRegistrationLineupTeam(
  supabase: DbClient,
  registrationIds: string[],
  lineupTeamId: string | null,
) {
  return supabase
    .from('registrations')
    .update({ lineup_team_id: lineupTeamId })
    .in('id', registrationIds)
}

/** Shape returned by getPlayerRegistrations — schedule with nested location and registration. */
export type PlayerRegistrationRow = {
  id: string
  title: string
  start_time: string
  end_time: string
  location_id: string
  max_players: number
  num_teams: number
  required_levels: string[]
  status: string
  position_prices: Json | null
  team_price: number | null
  created_by: string
  created_at: string
  updated_at: string
  locations: {
    id: string
    name: string
    address: string | null
    google_map_url: string | null
    notes: string | null
    is_active: boolean
    created_by: string
    created_at: string
    updated_at: string
  }
  registrations: Array<{
    id: string
    schedule_id: string
    registered_by: string
    player_id: string
    team_preference: string
    payment_status: string
    payment_proof_url: string | null
    attended: boolean
    qr_token: string | null
    preferred_position: string | null
    lineup_team_id: string | null
    payment_channel_id: string | null
    extracted_amount: number | null
    extracted_reference: string | null
    extracted_datetime: string | null
    extracted_sender: string | null
    extraction_confidence: string | null
    extracted_raw: Json | null
    registration_note: string | null
    created_at: string
    updated_at: string
  }>
}

/**
 * Fetches paginated registrations for a player (upcoming or past schedules).
 * Used by my-registrations-client.tsx.
 *
 * Uses explicit result type because !inner join + range produces a complex
 * PostgREST shape that TS cannot fully infer.
 */
export async function getPlayerRegistrations(
  supabase: DbClient,
  userId: string,
  timeFilter: 'upcoming' | 'past',
  page: number,
  pageSize: number,
) {
  const nowUtc = new Date().toISOString()
  const from = page * pageSize
  const to = from + pageSize - 1

  const query = supabase
    .from('schedules')
    .select('*, locations(*), registrations!inner(*)')
    .eq('registrations.player_id', userId)
    .order('start_time', { ascending: timeFilter === 'upcoming' })
    .range(from, to)

  if (timeFilter === 'upcoming') {
    return query.gte('start_time', nowUtc) as unknown as Promise<{ data: PlayerRegistrationRow[] | null; error: PostgrestError | null }>
  } else {
    return query.lt('start_time', nowUtc) as unknown as Promise<{ data: PlayerRegistrationRow[] | null; error: PostgrestError | null }>
  }
}
