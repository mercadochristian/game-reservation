import { createServiceClient } from '@/lib/supabase/service'
import type { Location } from '@/types'
import { LocationsClient } from './locations-client'

export default async function LocationsPage() {
  const supabase = createServiceClient()
  const { data } = await (supabase.from('locations') as any)
    .select('*')
    .order('created_at', { ascending: false })

  const initialLocations: Location[] = data ?? []

  return <LocationsClient initialLocations={initialLocations} />
}
