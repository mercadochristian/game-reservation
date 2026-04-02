import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
import { getTodayManilaKey } from '@/lib/utils/timezone'
import { logError } from '@/lib/logger'
import { getUserRole } from '@/lib/queries'

type ScannerRole = 'admin' | 'super_admin' | 'facilitator'
const ALLOWED_ROLES: ScannerRole[] = ['admin', 'super_admin', 'facilitator']

export interface ScannerSchedule {
  id: string
  start_time: string
  end_time: string
  status: string
  location_id: string
  max_players: number
  location: {
    id: string
    name: string
  }
  registered_count: number
  attended_count: number
}

function parseDateRange(dateRangeParam: string): { startDate: string; endDate: string } {
  // Format: 'all' | 'last7' | 'last30' | 'date:YYYY-MM-DD'
  const now = new Date()

  if (dateRangeParam.startsWith('date:')) {
    const dateStr = dateRangeParam.replace('date:', '')
    return { startDate: dateStr, endDate: dateStr }
  }

  let daysBack = 60 // default 'all'
  if (dateRangeParam === 'last7') daysBack = 7
  else if (dateRangeParam === 'last30') daysBack = 30

  const cutoffDate = new Date(now)
  cutoffDate.setDate(cutoffDate.getDate() - daysBack)
  const startDate = cutoffDate.toISOString().split('T')[0]
  const endDate = now.toISOString().split('T')[0]

  return { startDate, endDate }
}

export async function GET(req: NextRequest) {
  try {
    const locationId = req.nextUrl.searchParams.get('locationId')
    const dateRangeParam = req.nextUrl.searchParams.get('dateRange') || `date:${getTodayManilaKey()}`

    // Authenticate user
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify role
    const { data: userProfile, error: userError } = await getUserRole(supabase, authUser.id)

    if (userError || !userProfile || !ALLOWED_ROLES.includes(userProfile.role as ScannerRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { startDate, endDate } = parseDateRange(dateRangeParam)
    const startIso = `${startDate}T00:00:00.000Z`
    const endIso = `${endDate}T23:59:59.999Z`

    const service = createServiceClient()

    // Query schedules with location join
    let query = service
      .from('schedules')
      .select('id, start_time, end_time, status, location_id, max_players, locations(id, name)')
      .gte('start_time', startIso)
      .lte('start_time', endIso)

    if (locationId) {
      query = query.eq('location_id', locationId)
    }

    const { data: schedules, error: schedulesError } = await query.order('start_time', { ascending: true })

    if (schedulesError) {
      void logError('scanner.schedules.query_failed', { error: schedulesError, locationId, dateRangeParam }, authUser.id)
      return NextResponse.json({ error: `Failed to fetch schedules: ${schedulesError.message}` }, { status: 500 })
    }

    if (!schedules || !Array.isArray(schedules)) {
      return NextResponse.json([], { status: 200 })
    }

    // For each schedule, count registrations
    const scheduleIds = schedules.map((s: any) => s.id)
    const registrationCountMap = new Map<string, number>()
    const attendanceCountMap = new Map<string, number>()

    if (scheduleIds.length > 0) {
      // Fetch all registrations for these schedules
      const { data: allRegistrations, error: regError } = await service
        .from('registrations')
        .select('id, schedule_id, attended')
        .in('schedule_id', scheduleIds)

      if (regError) {
        void logError('scanner.registrations.query_failed', { error: regError, scheduleIds }, authUser.id)
      }

      if (Array.isArray(allRegistrations)) {
        // Count total and attended per schedule
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

    // Transform response
    const result: ScannerSchedule[] = schedules.map((schedule: any) => ({
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

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    void logError('scanner.schedules.unhandled', { error: errorMsg, stack: error instanceof Error ? error.stack : undefined })
    return NextResponse.json({ error: `Internal server error: ${errorMsg}` }, { status: 500 })
  }
}
