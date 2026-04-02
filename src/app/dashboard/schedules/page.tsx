import { createServiceClient } from '@/lib/supabase/service'
import type { ScheduleWithLocation, Location } from '@/types'
import { SchedulesClient } from './schedules-client'

export default async function SchedulesPage() {
  const supabase = createServiceClient()

  // Foreign key join (schedules -> locations) cannot be validated by TS without
  // full Relationships in the Database type; cast result to the known shape.
  const [schedulesResult, locationsResult] = await Promise.all([
    supabase.from('schedules')
      .select('*, locations(id, name, address, google_map_url)')
      .order('start_time', { ascending: false }) as unknown as Promise<{ data: ScheduleWithLocation[] | null }>,
    supabase.from('locations')
      .select('id, name')
      .eq('is_active', true)
      .order('name') as unknown as Promise<{ data: Pick<Location, 'id' | 'name'>[] | null }>,
  ])

  const initialSchedules: ScheduleWithLocation[] = schedulesResult.data ?? []
  const initialLocations = (locationsResult.data ?? []) as Location[]

  return (
    <SchedulesClient
      initialSchedules={initialSchedules}
      initialLocations={initialLocations}
    />
  )
}
