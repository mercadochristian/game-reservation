import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { adminRegistrationSchema, AdminRegistrationRequest } from '@/lib/validations/admin-registration'
import { groupPlayerSchema, GroupPlayer } from '@/lib/validations/group-registration'
import { logError } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

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
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('role')
      .eq('id', authUser.id)
      .single() as { data: { role: string } | null; error: any }

    if (adminError || !adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'super_admin')) {
      return NextResponse.json(
        { error: 'Only admins can register players' },
        { status: 403 }
      )
    }

    // Use service client for admin operations
    const serviceClient = createServiceClient()

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
          // Check if email already exists in users table
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', player.email)
            .single() as { data: { id: string } | null; error: any }

          if (existingUser) {
            // Reuse existing user (could be a real user or another guest)
            resolution.user_id = existingUser.id
          } else {
            // Create stub auth user and public user record
            try {
              const { data: authData, error: authError } =
                await serviceClient.auth.admin.createUser({
                  email: player.email,
                  email_confirm: true,
                  user_metadata: {
                    first_name: player.first_name,
                    last_name: player.last_name,
                  },
                })

              if (authError || !authData.user) {
                void logError('admin.register.guest_create', authError || new Error('Unknown auth error'), authUser?.id)
                resolution.error = 'Failed to create account. Please try again.'
              } else {
                const newUserId = authData.user.id

                // Insert public.users record
                const { error: insertError } = await (serviceClient
                  .from('users') as any)
                  .insert({
                    id: newUserId,
                    email: player.email,
                    first_name: player.first_name,
                    last_name: player.last_name,
                    player_contact_number: player.phone || null,
                    profile_completed: false,
                    is_guest: true,
                    role: 'player',
                  })

                if (insertError) {
                  void logError('admin.register.user_insert', insertError, authUser?.id, { email: player.email })
                  resolution.error = 'Failed to add player. Please try again.'
                } else {
                  resolution.user_id = newUserId
                }
              }
            } catch (err) {
              void logError('admin.register.guest_exception', err instanceof Error ? err : new Error(String(err)), authUser?.id, { email: player.email })
              resolution.error = 'Failed to add guest player. Please try again.'
            }
          }
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
        payment_proof_url: null,
        team_preference: validated.team_preference,
        payment_status: validated.payment_status,
      }))

    const { data: insertedRegistrations, error: insertError } = await (serviceClient
      .from('registrations') as any)
      .insert(registrationInserts)
      .select('id, player_id')

    if (insertError) {
      console.error('Batch registration insert error:', insertError)
      void logError('admin.register.batch_insert', insertError, authUser.id, { playerCount: registrationInserts.length })
      return NextResponse.json(
        { error: 'Registration failed. Please try again.' },
        { status: 500 }
      )
    }

    // Step 5: Create team and assign members only if registration_mode is 'group' or 'team'
    if (validated.registration_mode === 'group' || validated.registration_mode === 'team') {
      const { data: registrantUser } = await supabase
        .from('users')
        .select('first_name')
        .eq('id', authUser.id)
        .single() as { data: { first_name: string | null } | null; error: any }

      const teamName = `${registrantUser?.first_name || 'Admin'}'s ${validated.registration_mode === 'team' ? 'Team' : 'Group'}`

      const { data: team, error: teamError } = await (serviceClient
        .from('teams') as any)
        .insert({ schedule_id: validated.schedule_id, name: teamName })
        .select('id')
        .single()

      if (teamError || !team) {
        console.error('Team creation error:', teamError)
        void logError('admin.register.team_create', teamError || new Error('Unknown team error'), authUser.id, { teamName })
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
        console.error('Team members insert error:', teamMemberError)
        void logError('admin.register.team_members', teamMemberError, authUser.id, { teamId: team?.id, memberCount: teamMemberInserts.length })
        return NextResponse.json(
          { error: 'Team member assignment failed. Please try again.' },
          { status: 500 }
        )
      }
    }

    // Step 6: Return success response
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

    console.error('Admin registration exception:', err)
    void logError('admin.register.unhandled', err instanceof Error ? err : new Error(String(err)))
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
