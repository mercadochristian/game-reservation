import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/logger'

type ScannerRole = 'admin' | 'super_admin' | 'facilitator'
const ALLOWED_ROLES: ScannerRole[] = ['admin', 'super_admin', 'facilitator']

export interface PlayerInfo {
  registration_id: string
  player: {
    id: string
    first_name: string | null
    last_name: string | null
  }
  payment_status: string
}

export interface PlayersResponse {
  attended: PlayerInfo[]
  pending: PlayerInfo[]
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  try {
    const { scheduleId } = await params

    // Authenticate user
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify role
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', authUser.id)
      .single() as { data: { role: string } | null; error: any }

    if (userError || !userProfile || !ALLOWED_ROLES.includes(userProfile.role as ScannerRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const service = createServiceClient()

    // Fetch all registrations for the schedule with payment status
    const { data: registrations, error: registrationsError } = await service
      .from('registrations')
      .select('id, player_id, attended, registration_payments(payment_status)')
      .eq('schedule_id', scheduleId)

    if (registrationsError) {
      const errorDetails = {
        code: registrationsError?.code,
        message: registrationsError?.message,
        details: registrationsError?.details,
        hint: registrationsError?.hint,
      }
      void logError('scanner.players.query_failed', errorDetails, authUser.id, { scheduleId })
      return NextResponse.json(
        { error: `Failed to fetch players: ${registrationsError?.message || 'Unknown error'}` },
        { status: 500 }
      )
    }

    if (!registrations || !Array.isArray(registrations)) {
      return NextResponse.json({ attended: [], pending: [] }, { status: 200 })
    }

    // Fetch player info for all registrations
    const playerIds = registrations.map((reg: any) => reg.player_id).filter(Boolean)
    let playerMap = new Map<string, any>()

    if (playerIds.length > 0) {
      const { data: players } = await service
        .from('users')
        .select('id, first_name, last_name')
        .in('id', playerIds)

      if (Array.isArray(players)) {
        players.forEach((player: any) => {
          playerMap.set(player.id, player)
        })
      }
    }

    // Separate attended and pending
    const attended: PlayerInfo[] = []
    const pending: PlayerInfo[] = []

    registrations.forEach((reg: any) => {
      const playerData = playerMap.get(reg.player_id)
      // Get payment_status from the joined registration_payments, or default to 'unknown'
      const paymentData = Array.isArray(reg.registration_payments)
        ? reg.registration_payments[0]
        : reg.registration_payments
      const paymentStatus = paymentData?.payment_status || 'unknown'

      const player: PlayerInfo = {
        registration_id: reg.id,
        player: {
          id: reg.player_id || '',
          first_name: playerData?.first_name || null,
          last_name: playerData?.last_name || null,
        },
        payment_status: paymentStatus,
      }

      if (reg.attended) {
        attended.push(player)
      } else {
        pending.push(player)
      }
    })

    const response: PlayersResponse = { attended, pending }

    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    void logError('scanner.players.unhandled', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
