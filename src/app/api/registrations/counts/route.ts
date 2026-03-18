import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/registrations/counts?schedule_ids=id1,id2,...
 *
 * Returns registration counts grouped by schedule and position.
 * Uses service client to bypass RLS so all registrations are visible.
 */
export async function GET(request: NextRequest) {
  try {
    const raw = request.nextUrl.searchParams.get('schedule_ids')?.trim()

    if (!raw) {
      return NextResponse.json(
        { error: 'Missing required parameter: schedule_ids' },
        { status: 400 }
      )
    }

    const scheduleIds = raw.split(',').map((id) => id.trim()).filter(Boolean)

    if (scheduleIds.length === 0) {
      return NextResponse.json({ counts: {}, positionCounts: {} })
    }

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('registrations')
      .select('schedule_id, preferred_position')
      .in('schedule_id', scheduleIds)

    if (error) {
      console.error('[GET /api/registrations/counts] Query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch registration counts' },
        { status: 500 }
      )
    }

    const counts: Record<string, number> = {}
    const positionCounts: Record<string, Record<string, number>> = {}

    for (const row of (data ?? []) as Array<{ schedule_id: string; preferred_position: string | null }>) {
      const sid = row.schedule_id
      counts[sid] = (counts[sid] ?? 0) + 1

      const pos = row.preferred_position
      if (pos) {
        positionCounts[sid] ??= {}
        positionCounts[sid][pos] = (positionCounts[sid][pos] ?? 0) + 1
      }
    }

    return NextResponse.json({ counts, positionCounts })
  } catch (err) {
    console.error('[GET /api/registrations/counts] Exception:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
