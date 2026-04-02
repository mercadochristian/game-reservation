import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { logActivity, logError } from '@/lib/logger'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params

    const supabase = await createClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Not authenticated' }, { status: 401 })
    }

    const service = createServiceClient()

    const { data: currentUser, error: currentUserError } = await service
      .from('users')
      .select('id, role')
      .eq('id', authUser.id)
      .single()

    if (currentUserError || !currentUser) {
      return NextResponse.json({ error: 'SERVER_ERROR', message: 'Failed to verify permissions' }, { status: 500 })
    }

    if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Insufficient permissions' }, { status: 403 })
    }

    if (userId === authUser.id) {
      return NextResponse.json({ error: 'INVALID_INPUT', message: 'Cannot ban yourself' }, { status: 400 })
    }

    const { data: targetUser, error: targetError } = await service
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .single()

    if (targetError || !targetUser) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'User not found' }, { status: 404 })
    }

    if (currentUser.role === 'admin' && (targetUser.role === 'admin' || targetUser.role === 'super_admin')) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Cannot ban admin users' }, { status: 403 })
    }

    const { error: updateError } = await service
      .from('users')
      .update({ banned_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (updateError) {
      return NextResponse.json({ error: 'SERVER_ERROR', message: 'Failed to ban user' }, { status: 500 })
    }

    try {
      await logActivity('user_banned', userId, { banned_by: currentUser.id })
    } catch (logErr) {
      void logError('users.ban.audit_failed', logErr instanceof Error ? logErr : new Error(String(logErr)), authUser.id, { userId })
    }

    revalidatePath('/dashboard/users')
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    void logError('users.ban.unhandled', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred' }, { status: 500 })
  }
}
