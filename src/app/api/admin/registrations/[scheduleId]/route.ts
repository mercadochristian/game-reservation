import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  try {
    const { scheduleId } = await params

    if (!scheduleId) {
      return NextResponse.json({ error: 'Schedule ID required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Fetch registrations for this schedule
    const { data: regsData, error: regsError } = await supabase
      .from('registrations')
      .select('id, player_id, registered_by, schedule_id, preferred_position, created_at, updated_at')
      .eq('schedule_id', scheduleId)
      .order('created_at', { ascending: false })

    if (regsError) throw regsError

    const regsArray = regsData || []
    if (regsArray.length === 0) {
      return NextResponse.json({ registrations: [] })
    }

    const registrationIds = new Set(regsArray.map((r: any) => r.id))
    const playerIds = [...new Set(regsArray.map((r: any) => r.player_id))]

    // Fetch users, payments, and team_members in parallel
    const [usersResult, paymentsResult, teamMembersResult] = await Promise.all([
      playerIds.length > 0
        ? supabase
            .from('users')
            .select('id, first_name, last_name, email, skill_level, is_guest')
            .in('id', playerIds)
        : Promise.resolve({ data: [] }),
      supabase
        .from('registration_payments')
        .select('registration_id, payer_id, payment_status'),
      supabase
        .from('team_members')
        .select('registration_id, teams(id, name)'),
    ])

    if (usersResult.error) throw usersResult.error

    // Build maps
    let userMap: Record<string, any> = {}
    if (usersResult.data) {
      userMap = (usersResult.data || []).reduce((acc: any, user: any) => {
        acc[user.id] = user
        return acc
      }, {})
    }

    let paymentMap: Record<string, string> = {}
    if (paymentsResult.error) {
      console.error('[API] Payment fetch error (non-fatal):', paymentsResult.error)
    } else {
      (paymentsResult.data || []).forEach((payment: any) => {
        if (payment.registration_id && registrationIds.has(payment.registration_id)) {
          paymentMap[payment.registration_id] = payment.payment_status
        }
        if (payment.payer_id && registrationIds.has(payment.payer_id)) {
          paymentMap[payment.payer_id] = payment.payment_status
        }
      })
    }

    let teamMembersMap: Record<string, { is_grouped: boolean; team_name: string | null }> = {}
    if (teamMembersResult.error) {
      console.error('[API] Team members fetch error (non-fatal):', teamMembersResult.error)
    } else {
      (teamMembersResult.data || []).forEach((member: any) => {
        if (registrationIds.has(member.registration_id)) {
          teamMembersMap[member.registration_id] = {
            is_grouped: true,
            team_name: member.teams?.name || null,
          }
        }
      })
    }

    // Combine registrations with all data
    const registrations = regsArray.map((reg: any) => {
      let paymentKey = reg.id
      if (reg.registered_by && reg.player_id && reg.registered_by !== reg.player_id) {
        paymentKey = reg.registered_by
      }

      const teamInfo = teamMembersMap[reg.id]

      return {
        ...reg,
        payment_status: paymentMap[paymentKey] || 'pending',
        users: userMap[reg.player_id] || null,
        team_members: [],
        is_grouped: !!teamInfo?.is_grouped,
        team_name: teamInfo?.team_name || null,
      }
    })

    return NextResponse.json({ registrations })
  } catch (error) {
    console.error('[API] Schedule registrations fetch error:', error)
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error)
    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
