import { createServiceClient } from '@/lib/supabase/service'
import { getStringParam } from '@/lib/utils/search-params'
import type { ScheduleWithLocation, Location } from '@/types'
import { PaymentsClient } from './payments-client'

interface PaymentWithExtraction {
  id: string
  player_id: string | null
  users: { first_name: string | null; last_name: string | null } | null
  payment_status: 'pending' | 'review' | 'paid' | 'rejected'
  payment_proof_url: string | null
  extracted_amount: number | null
  extracted_reference: string | null
  extracted_datetime: string | null
  extracted_sender: string | null
  extraction_confidence: 'high' | 'medium' | 'low' | 'failed' | null
  required_amount: number
  created_at: string
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const supabase = createServiceClient()

  const filterDate = getStringParam(params, 'date')
  const filterLocationId = getStringParam(params, 'locationId')

  // Fetch active locations for the filter dropdown
  const { data: locationsData } = await (supabase.from('locations') as any)
    .select('id, name, address, is_active')
    .eq('is_active', true)
    .order('name', { ascending: true })
  const locations: Location[] = locationsData ?? []

  // Fetch schedules (filtered by date and/or location if provided)
  let schedulesQuery = (supabase.from('schedules') as any)
    .select('*, locations(id, name)')

  if (filterDate) {
    const startOfDay = new Date(filterDate + 'T00:00:00+08:00').toISOString()
    const endOfDay = new Date(filterDate + 'T23:59:59+08:00').toISOString()
    schedulesQuery = schedulesQuery.gte('start_time', startOfDay).lte('start_time', endOfDay)
  }
  if (filterLocationId) {
    schedulesQuery = schedulesQuery.eq('location_id', filterLocationId)
  }

  const { data: schedulesData } = await schedulesQuery.order('start_time', { ascending: false })

  const schedules: ScheduleWithLocation[] = schedulesData ?? []

  // Determine selected schedule: from URL param or auto-select first (only if no filters active)
  let selectedScheduleId = getStringParam(params, 'scheduleId') || null

  // Fetch payments for selected schedule
  let initialRegistrations: PaymentWithExtraction[] = []
  let initialTotalCollected = 0
  let initialPendingCount = 0

  if (selectedScheduleId) {
    const { data: paymentsData } = await (supabase.from('user_payments') as any)
      .select(
        `id, registration_id, payment_status, payment_proof_url, extracted_amount, extracted_reference,
         extracted_datetime, extracted_sender, extraction_confidence, created_at, required_amount,
         registrations(id, player_id, users:player_id(id, first_name, last_name))`
      )
      .eq('schedule_id', selectedScheduleId)
      .order('created_at', { ascending: false })

    const payments = paymentsData ?? []
    initialRegistrations = payments.map((p: any) => ({
      id: p.id,
      player_id: p.registrations?.player_id,
      users: p.registrations?.users,
      payment_status: p.payment_status,
      payment_proof_url: p.payment_proof_url,
      extracted_amount: p.extracted_amount,
      extracted_reference: p.extracted_reference,
      extracted_datetime: p.extracted_datetime,
      extracted_sender: p.extracted_sender,
      extraction_confidence: p.extraction_confidence,
      required_amount: p.required_amount,
      created_at: p.created_at,
    }))

    const paid = initialRegistrations.filter((r) => r.payment_status === 'paid')
    initialTotalCollected = paid.reduce((sum, r) => sum + (r.extracted_amount ?? 0), 0)
    initialPendingCount = initialRegistrations.filter((r) => r.payment_status === 'pending').length
  }

  return (
    <PaymentsClient
      schedules={schedules}
      selectedScheduleId={selectedScheduleId}
      initialRegistrations={initialRegistrations}
      initialTotalCollected={initialTotalCollected}
      initialPendingCount={initialPendingCount}
      filterDate={filterDate}
      filterLocationId={filterLocationId}
      locations={locations}
    />
  )
}
