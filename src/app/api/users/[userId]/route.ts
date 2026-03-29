import { NextRequest, NextResponse } from 'next/server'
import type { UserRole } from '@/types'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { validateUserEditData } from '@/lib/validations/user-edit'
import { canEditField, canAssignRole } from '@/lib/permissions/user-editing'
import { logActivity } from '@/lib/logger'

function isUserRole(value: string): value is UserRole {
  return ['super_admin', 'admin', 'player', 'facilitator'].includes(value)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    // Validate request data
    const validation = validateUserEditData(body)
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', details: validation.errors },
        { status: 400 }
      )
    }

    // Get current user from session
    const supabase = await createClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Fetch current user details (for permission check)
    const serviceClient = createServiceClient()
    const { data: currentUser, error: currentUserError } = await serviceClient
      .from('users')
      .select('id, role')
      .eq('id', authUser.id)
      .single()

    if (currentUserError || !currentUser) {
      return NextResponse.json(
        { error: 'SERVER_ERROR', message: 'An error occurred while updating user' },
        { status: 500 }
      )
    }

    if (!isUserRole(currentUser.role)) {
      return NextResponse.json(
        { error: 'SERVER_ERROR', message: 'An error occurred while updating user' },
        { status: 500 }
      )
    }

    // Fetch target user to edit
    const { data: targetUser, error: targetUserError } = await serviceClient
      .from('users')
      .select('id, role, email')
      .eq('id', userId)
      .single()

    if (targetUserError || !targetUser) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'User not found' },
        { status: 404 }
      )
    }

    // Check permissions for each field being edited
    const fieldsToEdit = Object.keys(validation.data).filter(
      key => validation.data[key as keyof typeof validation.data] !== undefined
    )

    // Check for self-demotion first (before general permissions)
    if (fieldsToEdit.includes('role') && validation.data.role) {
      if (
        (currentUser.role === 'admin' || currentUser.role === 'super_admin') &&
        currentUser.id === targetUser.id &&
        (validation.data.role !== 'admin' && validation.data.role !== 'super_admin')
      ) {
        return NextResponse.json(
          {
            error: 'SELF_DEMOTION',
            message: 'You cannot change your own role to a lower privilege level',
          },
          { status: 400 }
        )
      }
    }

    for (const field of fieldsToEdit) {
      if (!canEditField(currentUser.role, field as any)) {
        return NextResponse.json(
          { error: 'PERMISSION_DENIED', message: `You don't have permission to edit ${field}` },
          { status: 403 }
        )
      }

      // For role field, also check if they can assign the specific role
      if (field === 'role' && validation.data.role) {
        // Cannot change role of admin or super_admin users (only super_admin can do this)
        if ((targetUser.role === 'admin' || targetUser.role === 'super_admin') && currentUser.role !== 'super_admin') {
          return NextResponse.json(
            { error: 'PERMISSION_DENIED', message: `You don't have permission to edit role of ${targetUser.role} users` },
            { status: 403 }
          )
        }

        if (!canAssignRole(currentUser.role, validation.data.role as any)) {
          return NextResponse.json(
            { error: 'PERMISSION_DENIED', message: `You don't have permission to assign role ${validation.data.role}` },
            { status: 403 }
          )
        }
      }
    }

    // Check email uniqueness if email is being updated and differs from current
    if (validation.data.email && validation.data.email !== targetUser.email) {
      const { data: existingUser, error: emailError } = await serviceClient
        .from('users')
        .select('id')
        .eq('email', validation.data.email)

      if (emailError) {
        return NextResponse.json(
          { error: 'SERVER_ERROR', message: 'An error occurred while updating user' },
          { status: 500 }
        )
      }

      if (existingUser && existingUser.length > 0) {
        return NextResponse.json(
          { error: 'EMAIL_IN_USE', message: 'Email is already in use' },
          { status: 400 }
        )
      }
    }

    // Check for role change and self-demotion
    const isRoleChanging = validation.data.role && validation.data.role !== targetUser.role
    if (isRoleChanging && validation.data.role) {
      // Prevent self-demotion: user trying to remove their own admin/super_admin status
      if (
        (currentUser.role === 'admin' || currentUser.role === 'super_admin') &&
        currentUser.id === targetUser.id &&
        (validation.data.role !== 'admin' && validation.data.role !== 'super_admin')
      ) {
        return NextResponse.json(
          {
            error: 'SELF_DEMOTION',
            message: 'You cannot change your own role to a lower privilege level',
          },
          { status: 400 }
        )
      }
    }

    // Build update object from validated fields
    const updateData: Record<string, any> = {}
    for (const field of fieldsToEdit) {
      updateData[field] = validation.data[field as keyof typeof validation.data]
    }
    updateData.updated_at = new Date().toISOString()

    // Update user in database
    const { data: updatedUser, error: updateError } = await serviceClient
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()

    if (updateError || !updatedUser) {
      return NextResponse.json(
        { error: 'SERVER_ERROR', message: 'An error occurred while updating user' },
        { status: 500 }
      )
    }

    // Create audit log entry if role changed
    if (isRoleChanging && validation.data.role) {
      await logActivity('role_change', userId, {
        changed_by: currentUser.id,
        old_role: targetUser.role,
        new_role: validation.data.role,
      })
    }

    return NextResponse.json(updatedUser, { status: 200 })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'An error occurred while updating user' },
      { status: 500 }
    )
  }
}
