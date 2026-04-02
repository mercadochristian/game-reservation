import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { paymentEditSchema } from '@/lib/validations/payment-edit'
import { logActivity, logError } from '@/lib/logger'
import { getUserRole, updatePaymentExtraction } from '@/lib/queries'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify admin role
  const { data: adminUser, error: roleError } = await getUserRole(supabase, user.id)

  if (roleError || !adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'super_admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = paymentEditSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 422 })
  }

  const {
    extracted_amount,
    extracted_reference,
    extracted_datetime,
    extracted_sender,
    payment_note: rawNote,
  } = result.data

  // Validate and clean payment_note
  const payment_note = rawNote?.trim() || null

  const serviceClient = createServiceClient()
  const { error: updateError } = await updatePaymentExtraction(serviceClient, id, {
    extracted_amount,
    extracted_reference,
    extracted_datetime,
    extracted_sender,
    payment_note,
  })

  if (updateError) {
    await logError('payment.edit', updateError, user.id, {
      payment_id: id,
    })
    return NextResponse.json({ error: 'Failed to update payment. Please try again.' }, { status: 500 })
  }

  await logActivity('payment.edit', user.id, {
    payment_id: id,
    extracted_amount,
    extracted_reference,
    extracted_datetime,
    extracted_sender,
    payment_note,
  })

  return NextResponse.json({ success: true })
}
