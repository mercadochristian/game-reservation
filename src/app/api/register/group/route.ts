import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { groupRegistrationSchema, GroupPlayer } from '@/lib/validations/group-registration'
import { logError, logActivity } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import {
  getRequiredPositions,
  validateGroupPositions,
  validateTeamPositions,
} from '@/lib/utils/registration-positions'
import { createGuestUser } from '@/lib/services/guest-user'
import { computeGroupAmount, computeTeamAmount } from '@/lib/utils/pricing'

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
    const validated = groupRegistrationSchema.parse(body)

    // Extract and normalize registration_note
    const rawNote = validated.registration_note
    const registration_note = rawNote?.trim() || null

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

    // Use service client for admin operations
    const serviceClient = createServiceClient()

    // Schedule validation: check if schedule is available (not past, not full, not cancelled)
    const { data: schedule, error: scheduleError } = await (serviceClient
      .from('schedules')
      .select('start_time, status, max_players, position_prices, team_price')
      .eq('id', validated.schedule_id)
      .single() as any)

    if (scheduleError || !schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      )
    }

    // Check if schedule is in the past
    if (new Date(schedule.start_time) < new Date()) {
      await logError(
        'registration.rejected_past_schedule',
        'Player attempted to register for a past schedule',
        authUser.id,
        { schedule_id: validated.schedule_id }
      )
      return NextResponse.json(
        { error: 'Registration for this schedule has closed' },
        { status: 400 }
      )
    }

    // Check if schedule is cancelled or completed
    if (schedule.status === 'cancelled' || schedule.status === 'completed') {
      return NextResponse.json(
        { error: 'This schedule is no longer accepting registrations' },
        { status: 400 }
      )
    }

    // Check if schedule has available slots
    const { count: existingRegistrationCount } = await serviceClient
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('schedule_id', validated.schedule_id)

    const slotsRemaining = (schedule.max_players ?? 0) - (existingRegistrationCount ?? 0)
    if (slotsRemaining < validated.players.length) {
      await logError(
        'registration.rejected_full_schedule',
        'Player attempted to register for a full schedule',
        authUser.id,
        {
          schedule_id: validated.schedule_id,
          slots_remaining: slotsRemaining,
          requested: validated.players.length,
        }
      )
      return NextResponse.json(
        { error: 'Not enough slots available for this registration' },
        { status: 400 }
      )
    }

    // Step 0: Player count and position validation - different rules for group vs team
    if (validated.registration_mode === 'group') {
      // Group mode: must have 2-5 players
      if (validated.players.length < 2 || validated.players.length >= 6) {
        return NextResponse.json(
          { error: 'Group registration requires 2–5 players' },
          { status: 400 }
        )
      }

      // Group mode: max 1 setter, max 1 opposite, max 2 middle blockers, max 2 open spikers
      const groupValidation = validateGroupPositions(validated.players)

      if (!groupValidation.valid) {
        const issueDescriptions = groupValidation.issues?.map((issue: any) => {
          return `${issue.position} (maximum ${issue.max}, have ${issue.provided})`
        }).join(', ')

        return NextResponse.json(
          {
            error: `Group does not meet position requirements. Issues: ${issueDescriptions}`,
            issues: groupValidation.issues,
          },
          { status: 400 }
        )
      }
    } else if (validated.registration_mode === 'team') {
      // Team mode: must have at least 6 players
      if (validated.players.length < 6) {
        return NextResponse.json(
          { error: 'Team registration requires at least 6 players' },
          { status: 400 }
        )
      }

      // Team mode: must have complete required lineup (1 setter, 2 middle blockers, 2 open spikers, 1 opposite spiker)
      const required = getRequiredPositions()
      const teamValidation = validateTeamPositions(validated.players, required)

      if (!teamValidation.valid) {
        return NextResponse.json(
          {
            error: 'Team does not meet minimum position requirements. Required: ' +
              Object.entries(required)
                .map(([pos, count]) => `${count} ${pos}`)
                .join(', '),
            missing: teamValidation.missing,
          },
          { status: 400 }
        )
      }
    }

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
          const { data: existingUser, error: lookupError } = await supabase
            .from('users')
            .select('id')
            .eq('id', player.user_id)
            .single()

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
            operationName: 'register.group',
          })

          resolution.user_id = result.user_id
          resolution.error = result.error
        }
      } catch (err) {
        void logError('register.group.player_resolve', err instanceof Error ? err : new Error(String(err)), authUser?.id)
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
    // If any player is already registered for this schedule, reject the whole batch
    const playerIds = resolvedPlayers
      .filter((r) => r.user_id)
      .map((r) => r.user_id as string)

    const { data: existingRegs } = await supabase
      .from('registrations')
      .select('player_id')
      .eq('schedule_id', validated.schedule_id)
      .in('player_id', playerIds) as { data: Array<{ player_id: string }> | null; error: any }

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
        team_preference: validated.registration_mode as 'group' | 'team',
        registration_note,
      }))

    const { data: insertedRegistrations, error: insertError } = await (serviceClient
      .from('registrations') as any)
      .insert(registrationInserts)
      .select('id, player_id')

    if (insertError) {
      logError('register.group.batch_insert', insertError, authUser.id, { playerCount: registrationInserts.length })
      return NextResponse.json(
        { error: 'Registration failed. Please try again.' },
        { status: 500 }
      )
    }

    // Step 5: Create pre-formed team and assign members (for group/team modes)
    const { data: registrantUser } = await supabase
      .from('users')
      .select('first_name')
      .eq('id', authUser.id)
      .single() as { data: { first_name: string | null } | null; error: any }

    const teamName = `${registrantUser?.first_name || 'Group'}'s ${validated.registration_mode === 'team' ? 'Team' : 'Group'}`

    const { data: team, error: teamError } = await (serviceClient
      .from('teams') as any)
      .insert({ schedule_id: validated.schedule_id, name: teamName })
      .select('id')
      .single()

    if (teamError || !team) {
      logError('register.group.team_create', teamError || new Error('Unknown team error'), authUser.id, { teamName })
      return NextResponse.json(
        { error: 'Team creation failed. Please try again.' },
        { status: 500 }
      )
    }

    // Map inserted registrations by player_id for team member creation
    const regsByPlayerId = new Map((insertedRegistrations || []).map((r: any) => [r.player_id, r.id]))

    const teamMemberInserts = resolvedPlayers
      .filter((r): r is PlayerResolution & { user_id: string } => !!r.user_id)
      .map((r: PlayerResolution & { user_id: string }) => ({
        team_id: team.id,
        player_id: r.user_id,
        registration_id: regsByPlayerId.get(r.user_id),
        position: r.player.preferred_position,
      }))

    const { error: teamMemberError } = await (serviceClient
      .from('team_members') as any)
      .insert(teamMemberInserts)

    if (teamMemberError) {
      logError('register.group.team_members', teamMemberError, authUser.id, { teamId: team?.id, memberCount: teamMemberInserts.length })
      return NextResponse.json(
        { error: 'Team member assignment failed. Please try again.' },
        { status: 500 }
      )
    }

    // Step 6: Create single registration_payments record for the group/team
    const requiredAmount =
      validated.registration_mode === 'team'
        ? computeTeamAmount(schedule)
        : computeGroupAmount(
            schedule,
            resolvedPlayers
              .filter((r) => r.user_id)
              .map((r) => r.player.preferred_position)
          )

    const { data: userPayment, error: userPaymentError } = await (serviceClient
      .from('registration_payments') as any)
      .insert({
        team_id: team.id,
        payer_id: authUser.id,
        schedule_id: validated.schedule_id,
        registration_type: validated.registration_mode,
        required_amount: requiredAmount,
        payment_status: 'pending',
        payment_proof_url: validated.payment_proof_path,
        payment_channel_id: validated.payment_channel_id || null,
      })
      .select('id')
      .single()

    if (userPaymentError || !userPayment) {
      logError('register.group.user_payment', userPaymentError || new Error('Unknown payment error'), authUser.id, { teamId: team?.id })
      return NextResponse.json(
        { error: 'Payment record creation failed. Please try again.' },
        { status: 500 }
      )
    }

    // Step 7: Trigger AI extraction for registration_payments (non-blocking)
    const origin = new URL(request.url).origin
    fetch(new URL('/api/payment-proof/extract', origin), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_payment_id: userPayment.id,
        payment_proof_url: validated.payment_proof_path,
      }),
    })
      .then(() => {
        void logActivity('payment_proof.extract', authUser.id, {
          registration_mode: validated.registration_mode,
          player_count: insertedRegistrations?.length || 0,
        })
      })
      .catch((err) => {
        logError('payment_proof.extract_failed', err, authUser.id, {
          registration_mode: validated.registration_mode,
        })
      })

    // Step 8: Revalidate home page cache to reflect updated slot counts
    revalidatePath('/')

    // Step 9: Return success response
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

    logError('register.group.unhandled', err instanceof Error ? err : new Error(String(err)))
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
