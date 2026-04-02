import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
import { getUserRole, getRegistrationsBySchedule, getUsersByIds } from '@/lib/queries'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  try {
    const { scheduleId } = await params

    if (!scheduleId) {
      return NextResponse.json({ error: 'Schedule ID required' }, { status: 400 })
    }

    // Authenticate and authorize user
    const authSubabase = await createClient()
    const { data: { user: authUser } } = await authSubabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const { data: adminUser, error: adminError } = await getUserRole(authSubabase, authUser.id)

    if (adminError || !adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = createServiceClient()

    // Fetch registrations for this schedule
    const { data: regsData, error: regsError } = await getRegistrationsBySchedule(supabase, scheduleId)

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
        ? getUsersByIds(supabase, playerIds)
        : Promise.resolve({ data: [], error: null } as any),
      supabase
        .from('registration_payments')
        .select('registration_id, payer_id, payment_status')
        .in('registration_id', Array.from(registrationIds)),
      supabase
        .from('team_members')
        .select('registration_id, teams(id, name)')
        .in('registration_id', Array.from(registrationIds)),
    ] as const)

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
    return NextResponse.json(
      { error: 'Failed to fetch schedule registrations' },
      { status: 500 }
    )
  }
}
