import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
import { getUserRole, getPaymentStatusBySchedules } from '@/lib/queries'

export interface ScheduleWithPaymentSummary {
  id: string
  start_time: string
  end_time: string
  location_id: string
  max_players: number
  created_at: string
  updated_at: string
  locations: {
    id: string
    name: string
    address: string
    google_map_url: string | null
  }
  totalCollected: number
  pendingCount: number
}

export async function GET(req: NextRequest) {
  try {
    const locationId = req.nextUrl.searchParams.get('locationId')
    const dateRange = req.nextUrl.searchParams.get('dateRange') || 'all'

    if (!locationId) {
      return NextResponse.json(
        { error: 'Location ID required' },
        { status: 422 }
      )
    }

    // Authenticate and authorize user
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const { data: adminUser, error: adminError } = await getUserRole(supabase, authUser.id)

    if (adminError || !adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const serviceSubabase = createServiceClient()
    const now = new Date()

    // Calculate cutoff date based on dateRange filter
    let startOfDay: string
    let endOfDay: string | null = null

    if (dateRange.startsWith('date:')) {
      // Specific date filter
      const dateStr = dateRange.slice(5)
      startOfDay = new Date(dateStr + 'T00:00:00').toISOString()
      endOfDay = new Date(dateStr + 'T23:59:59').toISOString()
    } else {
      // Date range filter (all, last7, last30)
      let cutoffDate: Date
      switch (dateRange) {
        case 'last7':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'last30':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        default:
          // 'all' — 60 days
          cutoffDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
      }
      startOfDay = cutoffDate.toISOString()
    }

    // Fetch schedules
    let schedulesQuery = serviceSubabase
      .from('schedules')
      .select(
        `
        id,
        start_time,
        end_time,
        location_id,
        max_players,
        created_at,
        updated_at,
        locations (id, name, address, google_map_url)
      `
      )
      .eq('location_id', locationId)
      .gte('start_time', startOfDay)

    if (endOfDay) {
      schedulesQuery = schedulesQuery.lte('start_time', endOfDay)
    }

    const { data: schedules, error: schedulesError } = await schedulesQuery.order(
      'start_time',
      { ascending: false }
    )

    if (schedulesError) throw schedulesError

    const scheduleIds = (schedules || []).map((s: any) => s.id)
    let schedulesWithSummary: ScheduleWithPaymentSummary[] = (schedules || []).map((s: any) => ({
      ...s,
      totalCollected: 0,
      pendingCount: 0,
    }))

    if (scheduleIds.length > 0) {
      // Fetch aggregated payment data for all schedules
      const { data: payments, error: paymentsError } = await getPaymentStatusBySchedules(serviceSubabase, scheduleIds)

      if (paymentsError) throw paymentsError

      // Aggregate by schedule
      const paymentsBySchedule: Record<string, { totalCollected: number; pendingCount: number }> = {}
      ;(payments || []).forEach((p: any) => {
        if (!paymentsBySchedule[p.schedule_id]) {
          paymentsBySchedule[p.schedule_id] = { totalCollected: 0, pendingCount: 0 }
        }
        if (p.payment_status === 'paid') {
          paymentsBySchedule[p.schedule_id].totalCollected += p.extracted_amount || 0
        } else if (p.payment_status === 'pending') {
          paymentsBySchedule[p.schedule_id].pendingCount += 1
        }
      })

      schedulesWithSummary = schedulesWithSummary.map((s) => ({
        ...s,
        ...(paymentsBySchedule[s.id] || { totalCollected: 0, pendingCount: 0 }),
      }))
    }

    return NextResponse.json(schedulesWithSummary)
  } catch (error) {
    console.error('[API] Payments schedules fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment schedules' },
      { status: 500 }
    )
  }
}
