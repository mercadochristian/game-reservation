import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Creates a new team record and returns its ID.
 */
export async function createTeam(
  supabase: SupabaseClient,
  data: { schedule_id: string; name: string; team_type?: string },
) {
  return (supabase.from('teams') as any)
    .insert(data)
    .select('id')
    .single()
}

/**
 * Batch inserts team members.
 */
export async function createTeamMembers(
  supabase: SupabaseClient,
  members: Array<{
    team_id: string
    player_id: string
    registration_id?: string
    position?: string | null
  }>,
) {
  return (supabase.from('team_members') as any).insert(members)
}

/**
 * Fetches lineup teams for a schedule (team_type = 'lineup').
 * Used by dashboard/lineups/[scheduleId]/page.tsx.
 */
export async function getTeamsBySchedule(supabase: SupabaseClient, scheduleId: string) {
  return (supabase.from('teams') as any)
    .select('id, name')
    .eq('schedule_id', scheduleId)
    .eq('team_type', 'lineup')
    .order('created_at', { ascending: true })
}

/**
 * Deletes all lineup teams for a schedule.
 * Used by api/admin/lineups when regenerating lineups.
 */
export async function deleteLineupTeams(supabase: SupabaseClient, scheduleId: string) {
  return (supabase.from('teams') as any)
    .delete()
    .eq('schedule_id', scheduleId)
    .eq('team_type', 'lineup')
}

/**
 * Batch inserts lineup teams and returns their IDs.
 */
export async function insertLineupTeams(
  supabase: SupabaseClient,
  teamInserts: Array<{ schedule_id: string; name: string; team_type: string }>,
) {
  return (supabase.from('teams') as any)
    .insert(teamInserts)
    .select('id')
}
