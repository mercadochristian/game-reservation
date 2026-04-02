import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { logActivity, logError } from '@/lib/logger'

export async function PATCH(
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

    const { data: targetUser, error: targetError } = await service
      .from('users')
      .select('id, banned_at')
      .eq('id', userId)
      .single()

    if (targetError || !targetUser) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'User not found' }, { status: 404 })
    }

    const { error: updateError } = await service
      .from('users')
      .update({ banned_at: null, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (updateError) {
      return NextResponse.json({ error: 'SERVER_ERROR', message: 'Failed to unban user' }, { status: 500 })
    }

    try {
      await logActivity('user_unbanned', userId, { unbanned_by: currentUser.id })
    } catch (logErr) {
      void logError('users.unban.audit_failed', logErr instanceof Error ? logErr : new Error(String(logErr)), authUser.id, { userId })
    }

    revalidatePath('/dashboard/users')
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    void logError('users.unban.unhandled', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred' }, { status: 500 })
  }
}
