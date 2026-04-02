import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { adminRegistrationSchema } from '@/lib/validations/admin-registration'
import type { GroupPlayer } from '@/lib/validations/group-registration'
import { logError } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createGuestUser } from '@/lib/services/guest-user'
import { computeSoloAmount, computeGroupAmount, computeTeamAmount, type SchedulePricing } from '@/lib/utils/pricing'
import {
  getUserRole,
  getSchedulePricing,
  checkDuplicateRegistrations,
  createRegistrations,
  getUserById,
  getUserFirstName,
  createTeam,
  createTeamMembers,
  createPayment,
} from '@/lib/queries'

interface PlayerResolution {
  index: number
  player: GroupPlayer
  user_id: string | null
  error: string | null
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validated = adminRegistrationSchema.parse(body)

    const supabase = await createClient()

    // Authenticate user
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user is admin or super_admin
    const { data: adminUser, error: adminError } = await getUserRole(supabase, authUser.id)

    if (adminError || !adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'super_admin')) {
      return NextResponse.json(
        { error: 'Only admins can register players' },
        { status: 403 }
      )
    }

    // Use service client for admin operations
    const serviceClient = createServiceClient()

    // Fetch schedule with pricing
    const { data: scheduleData, error: scheduleError } = await getSchedulePricing(serviceClient, validated.schedule_id)

    if (scheduleError || !scheduleData) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      )
    }

    // Cast Json -> SchedulePricing since position_prices is stored as Json in DB
    const schedule = scheduleData as unknown as SchedulePricing

    // Step 1: Resolve all players (existing or create stub for guests)
    const resolvedPlayers: PlayerResolution[] = []

    for (let i = 0; i < validated.players.length; i++) {
      const player = validated.players[i]
      const resolution: PlayerResolution = {
        index: i,
        player,
        user_id: null,
        error: null,
      }

      try {
        if (player.type === 'existing') {
          // Verify user exists
          const { data: existingUser, error: lookupError } = await getUserById(supabase, player.user_id)

          if (lookupError || !existingUser) {
            resolution.error = 'User not found'
          } else {
            resolution.user_id = player.user_id
          }
        } else if (player.type === 'guest') {
          // Create or reuse guest user
          const result = await createGuestUser(serviceClient, supabase, {
            email: player.email,
            first_name: player.first_name,
            last_name: player.last_name,
            phone: player.phone,
            skill_level: player.skill_level,
          }, {
            userId: authUser?.id,
            operationName: 'admin.register',
          })

          resolution.user_id = result.user_id
          resolution.error = result.error
        }
      } catch (err) {
        void logError('admin.register.player_resolve', err instanceof Error ? err : new Error(String(err)), authUser?.id)
        resolution.error = 'Failed to verify player. Please try again.'
      }

      resolvedPlayers.push(resolution)
    }

    // Step 2: Check for errors in player resolution
    const failedResolutions = resolvedPlayers.filter((r) => r.error)
    if (failedResolutions.length > 0) {
      return NextResponse.json(
        {
          results: resolvedPlayers.map((r) => ({
            player_index: r.index,
            player_email_or_name:
              r.player.type === 'existing'
                ? `User ${r.player.user_id}`
                : `${r.player.first_name} ${r.player.last_name}`,
            success: !r.error,
            user_id: r.user_id || undefined,
            error: r.error || undefined,
          })),
        },
        { status: 400 }
      )
    }

    // Step 3: Check for duplicate registrations
    const playerIds = resolvedPlayers
      .filter((r) => r.user_id)
      .map((r) => r.user_id as string)

    const { data: existingRegs } = await checkDuplicateRegistrations(supabase, validated.schedule_id, playerIds)

    if (existingRegs && existingRegs.length > 0) {
      const duplicateIds = existingRegs.map((r) => r.player_id)
      const duplicateErrors = resolvedPlayers
        .filter((r) => duplicateIds.includes(r.user_id!))
        .map((r) => ({
          player_index: r.index,
          player_email_or_name:
            r.player.type === 'existing'
              ? `User ${r.player.user_id}`
              : `${r.player.first_name} ${r.player.last_name}`,
          success: false,
          error: 'Already registered for this schedule',
        }))

      return NextResponse.json(
        {
          results: resolvedPlayers.map((r) => {
            const dup = duplicateErrors.find((d) => d.player_index === r.index)
            return (
              dup || {
                player_index: r.index,
                player_email_or_name:
                  r.player.type === 'existing'
                    ? `User ${r.player.user_id}`
                    : `${r.player.first_name} ${r.player.last_name}`,
                success: true,
                user_id: r.user_id || undefined,
              }
            )
          }),
        },
        { status: 400 }
      )
    }

    // Step 4: Batch insert registrations (using service client to bypass RLS)
    const registrationInserts = resolvedPlayers
      .filter((r) => r.user_id)
      .map((r) => ({
        schedule_id: validated.schedule_id,
        player_id: r.user_id!,
        registered_by: authUser.id,
        preferred_position: r.player.preferred_position,
        team_preference: validated.team_preference,
      }))

    const { data: insertedRegistrations, error: insertError } = await createRegistrations(serviceClient, registrationInserts as any)

    if (insertError) {
      void logError('admin.register.batch_insert', insertError, authUser.id, { playerCount: registrationInserts.length })
      return NextResponse.json(
        { error: 'Registration failed. Please try again.' },
        { status: 500 }
      )
    }

    // Step 5: Create team and assign members only if registration_mode is 'group' or 'team'
    let teamId: string | null = null
    if (validated.registration_mode === 'group' || validated.registration_mode === 'team') {
      const { data: registrantUser } = await getUserFirstName(supabase, authUser.id)

      const teamName = `${registrantUser?.first_name || 'Admin'}'s ${validated.registration_mode === 'team' ? 'Team' : 'Group'}`

      const { data: team, error: teamError } = await createTeam(serviceClient, { schedule_id: validated.schedule_id, name: teamName })

      if (teamError || !team) {
        void logError('admin.register.team_create', teamError || new Error('Unknown team error'), authUser.id, { teamName })
        return NextResponse.json(
          { error: 'Team creation failed. Please try again.' },
          { status: 500 }
        )
      }

      teamId = team.id

      // Map inserted registrations by player_id for team member creation
      const regsByPlayerId = new Map((insertedRegistrations || []).map((r: any) => [r.player_id, r.id]))

      const teamMemberInserts = resolvedPlayers
        .filter((r): r is PlayerResolution & { user_id: string } => !!r.user_id)
        .map((r: PlayerResolution & { user_id: string }) => ({
          team_id: team.id,
          player_id: r.user_id,
          registration_id: regsByPlayerId.get(r.user_id) ?? '',
          position: r.player.preferred_position,
        }))

      const { error: teamMemberError } = await createTeamMembers(serviceClient, teamMemberInserts)

      if (teamMemberError) {
        void logError('admin.register.team_members', teamMemberError, authUser.id, { teamId: team?.id, memberCount: teamMemberInserts.length })
        return NextResponse.json(
          { error: 'Team member assignment failed. Please try again.' },
          { status: 500 }
        )
      }
    }

    // Step 6: Create registration_payments record(s)
    if (validated.registration_mode === 'single') {
      // Solo mode: create one payment per registration
      for (const reg of insertedRegistrations || []) {
        const requiredAmount = computeSoloAmount(
          schedule,
          resolvedPlayers.find(r => r.user_id === reg.player_id)?.player.preferred_position || null
        )

        const { error: paymentError } = await createPayment(serviceClient, {
          registration_id: reg.id,
          payer_id: authUser.id,
          schedule_id: validated.schedule_id,
          registration_type: 'solo',
          required_amount: requiredAmount,
          payment_status: validated.payment_status,
        })

        if (paymentError) {
          void logError('admin.register.user_payment', paymentError, authUser.id, { registrationId: reg.id })
          return NextResponse.json(
            { error: 'Payment record creation failed. Please try again.' },
            { status: 500 }
          )
        }
      }
    } else {
      // Group or Team mode: create one payment for the entire team
      const requiredAmount =
        validated.registration_mode === 'team'
          ? computeTeamAmount(schedule)
          : computeGroupAmount(
              schedule,
              resolvedPlayers
                .filter(r => r.user_id)
                .map(r => r.player.preferred_position)
            )

      // Use the first inserted registration as the reference for team payment
      if (!insertedRegistrations || insertedRegistrations.length === 0) {
        throw new Error('No registrations were created for team payment')
      }

      const { error: paymentError } = await createPayment(serviceClient, {
        team_id: teamId,
        registration_id: insertedRegistrations[0].id,
        payer_id: authUser.id,
        schedule_id: validated.schedule_id,
        registration_type: validated.registration_mode,
        required_amount: requiredAmount,
        payment_status: validated.payment_status,
      })

      if (paymentError) {
        void logError('admin.register.user_payment', paymentError, authUser.id, { teamId })
        return NextResponse.json(
          { error: 'Payment record creation failed. Please try again.' },
          { status: 500 }
        )
      }
    }

    // Step 7: Revalidate home page cache to reflect updated slot counts
    revalidatePath('/')

    // Step 8: Return success response
    return NextResponse.json({
      results: resolvedPlayers.map((r) => ({
        player_index: r.index,
        player_email_or_name:
          r.player.type === 'existing'
            ? `User ${r.player.user_id}`
            : `${r.player.first_name} ${r.player.last_name}`,
        success: true,
        user_id: r.user_id,
      })),
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', issues: err.issues },
        { status: 400 }
      )
    }

    void logError('admin.register.unhandled', err instanceof Error ? err : new Error(String(err)))
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
