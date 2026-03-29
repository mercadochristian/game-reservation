import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { validateUserEditData } from '@/lib/validations/user-edit'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId
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

    // Fetch target user to edit
    const { data: targetUser, error: targetUserError } = await serviceClient
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    if (targetUserError || !targetUser) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'User not found' },
        { status: 404 }
      )
    }

    // Placeholder: Permission checks, validation, role changes added in later tasks
    return NextResponse.json(
      { id: targetUser.id, message: 'Success' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'An error occurred while updating user' },
      { status: 500 }
    )
  }
}
