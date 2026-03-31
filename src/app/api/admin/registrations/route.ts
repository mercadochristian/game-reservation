import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const locationId = req.nextUrl.searchParams.get('locationId')
    const dateRange = req.nextUrl.searchParams.get('dateRange') || 'all'

    if (!locationId) {
      return NextResponse.json({ error: 'Location ID required' }, { status: 400 })
    }

    // Authenticate and authorize user
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('role')
      .eq('id', authUser.id)
      .single() as { data: { role: string } | null; error: any }

    if (adminError || !adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const serviceSubabase = createServiceClient()
    const now = new Date()

    // Calculate cutoff date based on dateRange filter
    let cutoffDate: Date
    switch (dateRange) {
      case 'last7':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'last30':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'all':
      default:
        cutoffDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
    }

    // 1. Fetch schedules without registrations array (use count() instead)
    const { data: schedules, error: schedulesError } = await serviceSubabase
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
      .gte('start_time', cutoffDate.toISOString())
      .order('start_time', { ascending: false })

    if (schedulesError) throw schedulesError

    const scheduleIds = (schedules || []).map((s: any) => s.id)
    const schedulesWithCount = (schedules || []).map((s: any) => ({
      ...s,
      registration_count: 0, // Will be updated below
    }))

    let registrations: any[] = []

    if (scheduleIds.length > 0) {
      // 2. Fetch registrations (payment/team details fetched on-demand per schedule)
      const { data: regsData, error: regsError } = await serviceSubabase
        .from('registrations')
        .select('id, player_id, registered_by, schedule_id, preferred_position, created_at, updated_at')
        .in('schedule_id', scheduleIds)
        .order('created_at', { ascending: false })

      if (regsError) throw regsError

      const regArray = regsData || []
      const playerIds = [...new Set(regArray.map((r: any) => r.player_id))]

      // 3. Update schedule counts
      const regCountBySchedule = regArray.reduce((acc: Record<string, number>, reg: any) => {
        acc[reg.schedule_id] = (acc[reg.schedule_id] || 0) + 1
        return acc
      }, {})

      schedulesWithCount.forEach((s: any) => {
        s.registration_count = regCountBySchedule[s.id] || 0
      })

      // 4. Fetch users for player names
      let userMap: Record<string, any> = {}
      if (playerIds.length > 0) {
        const { data: usersData, error: usersError } = await serviceSubabase
          .from('users')
          .select('id, first_name, last_name, email, skill_level, is_guest')
          .in('id', playerIds)

        if (usersError) throw usersError
        userMap = (usersData || []).reduce((acc: any, user: any) => {
          acc[user.id] = user
          return acc
        }, {})
      }

      // 5. Combine registrations with user data
      registrations = regArray.map((reg: any) => ({
        ...reg,
        users: userMap[reg.player_id] || null,
        team_members: [],
      }))
    }

    return NextResponse.json({
      schedules: schedulesWithCount,
      registrations,
    })
  } catch (error) {
    console.error('[API] Registrations fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch registrations' },
      { status: 500 }
    )
  }
}
