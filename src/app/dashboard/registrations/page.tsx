import { createServiceClient } from '@/lib/supabase/service'
import { getStringParam } from '@/lib/utils/search-params'
import type { RegistrationWithDetails, ScheduleWithSlots, Location } from '@/types'
import { RegistrationsClient } from './registrations-client'

export default async function RegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const supabase = createServiceClient()

  const filterDate = getStringParam(params, 'date')
  const filterLocationId = getStringParam(params, 'locationId')
  const selectedScheduleId = getStringParam(params, 'scheduleId') || null

  // Fetch active locations for the filter dropdown
  const { data: locationsData } = await (supabase.from('locations') as any)
    .select('id, name, address, is_active')
    .eq('is_active', true)
    .order('name', { ascending: true })
  const locations: Location[] = locationsData ?? []

  // Fetch schedules (filtered by date and/or location if provided)
  let schedulesQuery = (supabase.from('schedules') as any)
    .select('id, start_time, end_time, max_players, status, locations!inner(id, name, address, google_map_url), registrations(count)')

  if (filterDate) {
    const startOfDay = new Date(filterDate + 'T00:00:00+08:00').toISOString()
    const endOfDay = new Date(filterDate + 'T23:59:59+08:00').toISOString()
    schedulesQuery = schedulesQuery.gte('start_time', startOfDay).lte('start_time', endOfDay)
  }
  if (filterLocationId) {
    schedulesQuery = schedulesQuery.eq('location_id', filterLocationId)
  }

  const { data: schedulesData } = await schedulesQuery.order('start_time', { ascending: true })

  const schedules: ScheduleWithSlots[] = (schedulesData ?? []).map((s: any) => ({
    ...s,
    registration_count: s.registrations?.[0]?.count ?? 0,
  }))

  // Fetch registrations if a schedule is selected
  let initialRegistrations: RegistrationWithDetails[] = []
  let lineupTeams: Array<{ id: string; name: string }> = []

  if (selectedScheduleId) {
    const { data: regsData } = await (supabase.from('registrations') as any)
      .select(`
        id, schedule_id, player_id, registered_by, team_preference,
        attended, preferred_position, lineup_team_id, created_at,
        users!player_id(id, first_name, last_name, email, skill_level, is_guest),
        team_members!registration_id(team_id, teams(id, name))
      `)
      .eq('schedule_id', selectedScheduleId)
      .order('created_at', { ascending: true })

    // Fetch ALL payments for this schedule to match by registration_id OR team_id
    const { data: paymentsData } = await (supabase.from('registration_payments') as any)
      .select('id, registration_id, team_id, payment_status, created_at')
      .eq('schedule_id', selectedScheduleId)

    const paymentsMap = new Map<string, any[]>()
    paymentsData?.forEach((p: any) => {
      if (p.registration_id) {
        if (!paymentsMap.has(`reg_${p.registration_id}`)) {
          paymentsMap.set(`reg_${p.registration_id}`, [])
        }
        paymentsMap.get(`reg_${p.registration_id}`)!.push(p)
      }
      if (p.team_id) {
        if (!paymentsMap.has(`team_${p.team_id}`)) {
          paymentsMap.set(`team_${p.team_id}`, [])
        }
        paymentsMap.get(`team_${p.team_id}`)!.push(p)
      }
    })

    // Flatten registrations and assign payment status
    initialRegistrations = (regsData ?? []).map((r: any) => {
      // Try to find payment by registration_id first
      let payments = paymentsMap.get(`reg_${r.id}`) || []

      // If no payment by registration_id, try by team_id (for team registrations)
      if (payments.length === 0 && r.team_members?.length > 0) {
        const teamId = r.team_members[0]?.team_id
        if (teamId) {
          payments = paymentsMap.get(`team_${teamId}`) || []
        }
      }

      // Get most recent payment status
      const payment = payments.length > 0
        ? payments.sort((a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0]
        : null

      return {
        ...r,
        payment_status: payment?.payment_status || 'pending',
      }
    }) as RegistrationWithDetails[]

    // Fetch existing lineup teams for the schedule
    const { data: teamsData } = await (supabase.from('teams') as any)
      .select('id, name')
      .eq('schedule_id', selectedScheduleId)
      .eq('team_type', 'lineup')

    lineupTeams = (teamsData ?? []).map((t: any) => ({
      id: t.id,
      name: t.name,
    }))
  }

  return (
    <RegistrationsClient
      schedules={schedules}
      selectedScheduleId={selectedScheduleId}
      initialRegistrations={initialRegistrations}
      filterDate={filterDate}
      filterLocationId={filterLocationId}
      locations={locations}
      lineupTeams={lineupTeams}
    />
  )
}
