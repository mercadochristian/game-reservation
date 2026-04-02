import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getTodayManilaKey } from '@/lib/utils/timezone'
import { ScannerClient } from './scanner-client'
import type { Location } from '@/types'

export default async function ScannerPage() {
  const supabase = await createClient()
  const service = createServiceClient()
  const todayKey = getTodayManilaKey()

  // Fetch locations
  const { data: locationsData } = await supabase
    .from('locations')
    .select('id, name')
    .eq('is_active', true)
    .order('name', { ascending: true })

  // Partial select; cast to Location[] as ScannerClient only uses id and name
  const locations = (locationsData || []) as Location[]

  // Fetch schedules for today
  const startIso = `${todayKey}T00:00:00.000Z`
  const endIso = `${todayKey}T23:59:59.999Z`

  const { data: schedules } = await service
    .from('schedules')
    .select(`
      id,
      start_time,
      end_time,
      status,
      location_id,
      max_players,
      locations(id, name)
    `)
    .gte('start_time', startIso)
    .lte('start_time', endIso)
    .order('start_time', { ascending: true })

  // Count registrations for each schedule
  const scheduleIds = (schedules || []).map((s: any) => s.id)
  const registrationCountMap = new Map<string, number>()
  const attendanceCountMap = new Map<string, number>()

  if (scheduleIds.length > 0) {
    const { data: allRegistrations } = await service
      .from('registrations')
      .select('id, schedule_id, attended')
      .in('schedule_id', scheduleIds)

    if (allRegistrations) {
      allRegistrations.forEach((reg: any) => {
        const schedId = reg.schedule_id
        const total = (registrationCountMap.get(schedId) || 0) + 1
        registrationCountMap.set(schedId, total)

        if (reg.attended) {
          const attended = (attendanceCountMap.get(schedId) || 0) + 1
          attendanceCountMap.set(schedId, attended)
        }
      })
    }
  }

  // Transform schedules to match ScannerSchedule interface
  const transformedSchedules = (schedules || []).map((schedule: any) => ({
    id: schedule.id,
    start_time: schedule.start_time,
    end_time: schedule.end_time,
    status: schedule.status,
    location_id: schedule.location_id,
    max_players: schedule.max_players,
    location: {
      id: schedule.locations?.id || '',
      name: schedule.locations?.name || 'Unknown',
    },
    registered_count: registrationCountMap.get(schedule.id) || 0,
    attended_count: attendanceCountMap.get(schedule.id) || 0,
  }))

  return <ScannerClient initialLocations={locations} initialSchedules={transformedSchedules} />
}
