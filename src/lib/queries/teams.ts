import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, PlayerPosition } from '@/types/database'

type DbClient = SupabaseClient<Database>

/**
 * Creates a new team record and returns its ID.
 */
export async function createTeam(
  supabase: DbClient,
  data: { schedule_id: string; name: string; team_type?: string },
) {
  return supabase.from('teams')
    .insert(data)
    .select('id')
    .single()
}

/**
 * Batch inserts team members.
 */
export async function createTeamMembers(
  supabase: DbClient,
  members: Array<{
    team_id: string
    player_id: string
    registration_id: string
    position?: PlayerPosition | null
  }>,
) {
  return supabase.from('team_members').insert(members)
}

/**
 * Deletes all lineup teams for a schedule.
 * Used by api/admin/lineups when regenerating lineups.
 */
export async function deleteLineupTeams(supabase: DbClient, scheduleId: string) {
  return supabase.from('teams')
    .delete()
    .eq('schedule_id', scheduleId)
    .eq('team_type', 'lineup')
}

/**
 * Batch inserts lineup teams and returns their IDs.
 */
export async function insertLineupTeams(
  supabase: DbClient,
  teamInserts: Array<{ schedule_id: string; name: string; team_type: string }>,
) {
  return supabase.from('teams')
    .insert(teamInserts)
    .select('id')
}
