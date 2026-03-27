import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { RegistrationForLineup, ScheduleWithLocation } from '@/types'
import { LineupClient } from './lineup-client'

interface PageProps {
  params: Promise<{
    scheduleId: string
  }>
}

export default async function LineupPage({ params }: PageProps) {
  const { scheduleId } = await params

  // Check authentication and role
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/auth')
  }

  // Verify user has permission (admin, super_admin, or facilitator)
  const { data: userRecord } = await supabase
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .single() as { data: { role: string } | null }

  const allowedRoles = ['admin', 'super_admin', 'facilitator']
  if (!userRecord || !allowedRoles.includes(userRecord.role)) {
    redirect('/dashboard')
  }

  // Fetch data using service client
  const serviceClient = createServiceClient()

  // Fetch schedule
  const { data: scheduleData } = await (serviceClient
    .from('schedules') as any)
    .select('id, num_teams, start_time, end_time, locations!inner(id, name, address, google_map_url)')
    .eq('id', scheduleId)
    .single()

  if (!scheduleData) {
    redirect('/dashboard/registrations')
  }

  const schedule = scheduleData as ScheduleWithLocation & { num_teams: number }

  // Fetch registrations for the schedule
  const { data: registrationsData } = await (serviceClient
    .from('registrations') as any)
    .select(`
      id, schedule_id, player_id, team_preference, preferred_position, lineup_team_id,
      users!player_id(id, first_name, last_name, skill_level, is_guest),
      team_members!registration_id(team_id, teams(id, name))
    `)
    .eq('schedule_id', scheduleId)
    .order('created_at', { ascending: true })

  const registrations = (registrationsData ?? []) as RegistrationForLineup[]

  // Fetch existing lineup teams
  const { data: lineupTeamsData } = await (serviceClient.from('teams') as any)
    .select('id, name')
    .eq('schedule_id', scheduleId)
    .eq('team_type', 'lineup')
    .order('created_at', { ascending: true })

  const existingLineupTeams = (lineupTeamsData ?? []).map((t: any) => ({
    id: t.id,
    name: t.name,
  }))

  return (
    <LineupClient
      schedule={schedule}
      registrations={registrations}
      existingLineupTeams={existingLineupTeams}
    />
  )
}
