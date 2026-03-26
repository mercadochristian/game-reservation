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
    .select('id, start_time, end_time, max_players, status, locations!inner(id, name), registrations(count)')

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

  if (selectedScheduleId) {
    const { data: regsData } = await (supabase.from('registrations') as any)
      .select(`
        id, schedule_id, player_id, registered_by, team_preference,
        attended, preferred_position, created_at,
        users!player_id(id, first_name, last_name, email, skill_level, is_guest),
        team_members!registration_id(team_id, teams(id, name)),
        user_payments!registration_id(payment_status)
      `)
      .eq('schedule_id', selectedScheduleId)
      .order('created_at', { ascending: true })

    // Flatten user_payments for compatibility
    initialRegistrations = (regsData ?? []).map((r: any) => ({
      ...r,
      payment_status: r.user_payments?.[0]?.payment_status || 'pending',
    })) as RegistrationWithDetails[]
  }

  return (
    <RegistrationsClient
      schedules={schedules}
      selectedScheduleId={selectedScheduleId}
      initialRegistrations={initialRegistrations}
      filterDate={filterDate}
      filterLocationId={filterLocationId}
      locations={locations}
    />
  )
}
