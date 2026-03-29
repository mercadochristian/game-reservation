import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const locationId = req.nextUrl.searchParams.get('locationId')

    if (!locationId) {
      return NextResponse.json({ error: 'Location ID required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Fetch all schedules at this location
    const { data: schedules, error: schedulesError } = await supabase
      .from('schedules')
      .select(
        `
        id,
        start_time,
        end_time,
        location_id,
        max_players,
        price,
        created_at,
        updated_at,
        locations (id, name, address, google_map_url),
        registrations (id)
      `
      )
      .eq('location_id', locationId)
      .order('start_time', { ascending: false })

    if (schedulesError) throw schedulesError

    // Calculate registration count for each schedule
    const schedulesWithCount = (schedules || []).map((s: any) => ({
      ...s,
      registration_count: s.registrations?.length || 0,
    }))

    // Fetch all registrations for these schedules with full details
    const scheduleIds = schedulesWithCount.map((s: any) => s.id)

    let registrations: any[] = []
    if (scheduleIds.length > 0) {
      const { data, error: regsError } = await supabase
        .from('registrations')
        .select(
          `
          id,
          user_id,
          schedule_id,
          preferred_position,
          created_at,
          updated_at,
          payment_status,
          users (id, first_name, last_name, email, skill_level, is_guest),
          team_members (id, team_id, teams (id, name))
        `
        )
        .in('schedule_id', scheduleIds)
        .order('created_at', { ascending: false })

      if (regsError) throw regsError
      registrations = data || []
    }

    return NextResponse.json({
      schedules: schedulesWithCount,
      registrations,
    })
  } catch (error) {
    console.error('[API] Registrations fetch error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch registrations' },
      { status: 500 }
    )
  }
}
