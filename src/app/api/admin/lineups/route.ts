import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { saveLineupSchema } from '@/lib/validations/lineup'
import { logActivity, logError } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserRole, deleteLineupTeams, insertLineupTeams, updateRegistrationLineupTeam } from '@/lib/queries'

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validated = saveLineupSchema.parse(body)

    const supabase = await createClient()

    // Authenticate user
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user has permission (admin, super_admin, or facilitator)
    const { data: userRecord, error: userError } = await getUserRole(supabase, authUser.id)

    if (userError || !userRecord) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const allowedRoles = ['admin', 'super_admin', 'facilitator']
    if (!allowedRoles.includes(userRecord.role)) {
      return NextResponse.json(
        { error: 'Only admins and facilitators can set lineups' },
        { status: 403 }
      )
    }

    // Use service client for write operations
    const serviceClient = createServiceClient()

    // Step 1: Delete existing lineup teams for this schedule (cascades SET NULL on registrations.lineup_team_id)
    const { error: deleteError } = await deleteLineupTeams(serviceClient, validated.schedule_id)

    if (deleteError) {
      void logError('admin.lineups.delete_existing', deleteError, authUser.id, {
        schedule_id: validated.schedule_id,
      })
      return NextResponse.json(
        { error: 'Failed to clear existing lineup. Please try again.' },
        { status: 500 }
      )
    }

    // Step 2: Insert new lineup teams
    const teamInserts = validated.teams.map((t) => ({
      schedule_id: validated.schedule_id,
      name: t.name,
      team_type: 'lineup' as const,
    }))

    const { data: insertedTeams, error: insertError } = await insertLineupTeams(serviceClient, teamInserts)

    if (insertError || !insertedTeams || insertedTeams.length === 0) {
      void logError('admin.lineups.insert_teams', insertError || new Error('No teams inserted'), authUser.id, {
        schedule_id: validated.schedule_id,
        team_count: validated.teams.length,
      })
      return NextResponse.json(
        { error: 'Failed to create lineup teams. Please try again.' },
        { status: 500 }
      )
    }

    // Step 3: Bulk update registrations with lineup_team_id
    // Build update batches: group assignments by team_index
    const updatesByTeamIndex = new Map<number | null, string[]>()

    for (const assignment of validated.assignments) {
      const teamIndex = assignment.team_index
      if (!updatesByTeamIndex.has(teamIndex)) {
        updatesByTeamIndex.set(teamIndex, [])
      }
      updatesByTeamIndex.get(teamIndex)!.push(assignment.registration_id)
    }

    // Execute updates for each team
    for (const [teamIndex, registrationIds] of updatesByTeamIndex) {
      const lineupTeamId = teamIndex !== null ? insertedTeams[teamIndex].id : null

      const { error: updateError } = await updateRegistrationLineupTeam(serviceClient, registrationIds, lineupTeamId)

      if (updateError) {
        void logError('admin.lineups.update_registrations', updateError, authUser.id, {
          schedule_id: validated.schedule_id,
          team_index: teamIndex,
          registration_count: registrationIds.length,
        })
        return NextResponse.json(
          { error: 'Failed to assign players to teams. Please try again.' },
          { status: 500 }
        )
      }
    }

    // Step 4: Log the activity
    void logActivity('admin.lineups.saved', authUser.id, {
      schedule_id: validated.schedule_id,
      team_count: validated.teams.length,
      assigned_count: validated.assignments.length,
    })

    return NextResponse.json({
      success: true,
      message: 'Lineup saved successfully',
      teams_created: insertedTeams.length,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', issues: err.issues },
        { status: 400 }
      )
    }

    void logError(
      'admin.lineups.unhandled',
      err instanceof Error ? err : new Error(String(err))
    )
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
