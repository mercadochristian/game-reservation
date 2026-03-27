import { createServiceClient } from '@/lib/supabase/service'
import type { ScheduleWithLocation, Location } from '@/types'
import { SchedulesClient } from './schedules-client'

export default async function SchedulesPage() {
  const supabase = createServiceClient()

  const [schedulesResult, locationsResult] = await Promise.all([
    (supabase.from('schedules') as any)
      .select('*, locations(id, name)')
      .order('start_time', { ascending: false }),
    (supabase.from('locations') as any)
      .select('id, name')
      .eq('is_active', true)
      .order('name'),
  ])

  const initialSchedules: ScheduleWithLocation[] = schedulesResult.data ?? []
  const initialLocations: Location[] = locationsResult.data ?? []

  return (
    <SchedulesClient
      initialSchedules={initialSchedules}
      initialLocations={initialLocations}
    />
  )
}
