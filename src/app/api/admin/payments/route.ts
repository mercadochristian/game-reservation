import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { logActivity, logError } from '@/lib/logger'

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, payment_status } = body

    if (!id || !payment_status) {
      return NextResponse.json({ error: 'Missing id or payment_status' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const service = createServiceClient()
    const { error } = await service.from('registration_payments')
      .update({ payment_status })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await logActivity(`payment.${payment_status}`, user.id, {
      payment_id: id,
    })

    revalidatePath('/dashboard/payments')

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
