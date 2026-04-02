import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getStringParam } from '@/lib/utils/search-params'
import { getExtractionSetting } from '@/lib/config/extraction-settings'
import type { Location } from '@/types'
import { PaymentsClient } from './payments-client'

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams

  // Auth check
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    redirect('/auth')
  }

  // Role check (admin only)
  const serviceSupabase = createServiceClient()
  const { data: user, error: userError } = await serviceSupabase.from('users')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (userError || !user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    redirect('/dashboard')
  }

  // Fetch locations for filter dropdown
  const { data: locationsData } = await serviceSupabase.from('locations')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })

  const locations: Location[] = locationsData ?? []

  const { enabled: extractionEnabled } = getExtractionSetting()

  // Extract search params
  const initialSearchParams: Record<string, string> = {}
  const locationId = getStringParam(params, 'locationId')
  const dateRange = getStringParam(params, 'dateRange')
  const date = getStringParam(params, 'date')

  if (locationId) initialSearchParams.locationId = locationId
  if (dateRange) initialSearchParams.dateRange = dateRange
  if (date) initialSearchParams.date = date

  return (
    <PaymentsClient
      locations={locations}
      initialSearchParams={initialSearchParams}
      extractionEnabled={extractionEnabled}
    />
  )
}
