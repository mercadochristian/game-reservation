import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { groupRegistrationSchema } from '@/lib/validations/group-registration'
import type { GroupPlayer } from '@/lib/validations/group-registration'
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
import {
  getScheduleForRegistration,
  getRegistrationCountForSchedule,
  checkDuplicateRegistrations,
  getUserById,
  getUserFirstName,
} from '@/lib/queries'
import { getExtractionSetting } from '@/lib/config/extraction-settings'

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
    const { data: schedule, error: scheduleError } = await getScheduleForRegistration(serviceClient, validated.schedule_id)

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
    const { count: existingRegistrationCount } = await getRegistrationCountForSchedule(serviceClient, validated.schedule_id)

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

    // Compute required amount
    const requiredAmount =
      validated.registration_mode === 'team'
        ? computeTeamAmount(schedule)
        : computeGroupAmount(
            schedule,
            resolvedPlayers
              .filter((r) => r.user_id)
              .map((r) => r.player.preferred_position)
          )

    // Get registrant's first name for team naming
    const { data: registrantUser } = await getUserFirstName(supabase, authUser.id)
    const teamName = `${registrantUser?.first_name || 'Group'}'s ${
      validated.registration_mode === 'team' ? 'Team' : 'Group'
    }`

    // Build payloads for the RPC
    const registrationInserts = resolvedPlayers
      .filter((r) => r.user_id)
      .map((r) => ({
        player_id: r.user_id!,
        registered_by: authUser.id,
        preferred_position: r.player.preferred_position,
        team_preference: validated.registration_mode as 'group' | 'team',
        registration_note,
      }))

    const teamMemberInserts = resolvedPlayers
      .filter((r): r is PlayerResolution & { user_id: string } => !!r.user_id)
      .map((r) => ({
        player_id: r.user_id,
        position: r.player.preferred_position,
      }))

    // Check extraction setting to decide whether to trigger extraction
    const { enabled: extractionEnabled } = getExtractionSetting()

    // Atomic transaction: all 4 tables in one DB call — rolls back on any failure
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- database.ts not yet regenerated with register_group_transaction RPC signature; remove after running supabase gen types
    const { data: rpcResult, error: rpcError } = await (serviceClient as any).rpc(
      'register_group_transaction',
      {
        p_schedule_id: validated.schedule_id,
        p_registrations: registrationInserts,
        p_team: { name: teamName },
        p_team_members: teamMemberInserts,
        p_payment: {
          payer_id: authUser.id,
          required_amount: requiredAmount,
          payment_status: 'pending',
          payment_proof_url: validated.payment_proof_path,
          payment_channel_id: validated.payment_channel_id ?? null,
          registration_type: validated.registration_mode,
          extraction_status: extractionEnabled ? 'pending' : null,
        },
      }
    )

    if (rpcError || !rpcResult) {
      void logError('register.group.rpc', rpcError || new Error('No result from RPC'), authUser.id, {
        schedule_id: validated.schedule_id,
        player_count: registrationInserts.length,
      })
      return NextResponse.json(
        { error: 'Registration failed. Please try again.' },
        { status: 500 }
      )
    }

    // Only trigger extraction if it is enabled
    if (extractionEnabled) {
      const origin = new URL(request.url).origin
      void fetch(new URL('/api/payment-proof/extract', origin), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_payment_id: rpcResult.payment_id,
          payment_proof_url: validated.payment_proof_path,
        }),
      })
        .then(() => {
          void logActivity('payment_proof.extract', authUser.id, {
            registration_mode: validated.registration_mode,
            player_count: registrationInserts.length,
          })
        })
        .catch((err) => {
          void logError('payment_proof.extract_failed', err, authUser.id, {
            registration_mode: validated.registration_mode,
          })
        })
    }

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
