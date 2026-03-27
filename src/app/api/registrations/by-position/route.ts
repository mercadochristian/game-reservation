import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const schedule_id = request.nextUrl.searchParams.get('schedule_id')?.trim()
    const position = request.nextUrl.searchParams.get('position')?.trim()

    if (!schedule_id || !position) {
      return NextResponse.json(
        { error: 'Missing required parameters: schedule_id and position' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('registrations')
      .select('users!player_id(first_name, last_name)')
      .eq('schedule_id', schedule_id)
      .eq('preferred_position', position)

    if (error) {
      console.error('[GET /api/registrations/by-position] Query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch registered players' },
        { status: 500 }
      )
    }

    // Extract user objects from the registrations
    const players = (data ?? []).map((r: any) => ({
      first_name: r.users?.first_name ?? null,
      last_name: r.users?.last_name ?? null,
    }))

    return NextResponse.json(players, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
    })
  } catch (err) {
    console.error('[GET /api/registrations/by-position] Exception:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
