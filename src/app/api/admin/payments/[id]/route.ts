import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { logError } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'

export interface PaymentWithExtraction {
  id: string
  player_id: string | null
  users: { first_name: string | null; last_name: string | null } | null
  payer: { first_name: string | null; last_name: string | null } | null
  payment_status: 'pending' | 'review' | 'paid' | 'rejected'
  payment_proof_url: string | null
  extracted_amount: number | null
  extracted_reference: string | null
  extracted_datetime: string | null
  extracted_sender: string | null
  extraction_confidence: 'high' | 'medium' | 'low' | 'failed' | null
  required_amount: number
  registration_type: 'solo' | 'group' | 'team'
  created_at: string
  payment_note: string | null
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: scheduleId } = await params

    // Authenticate and authorize user
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('role')
      .eq('id', authUser.id)
      .single() as { data: { role: string } | null; error: any }

    if (adminError || !adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const serviceSubabase = createServiceClient()

    // Fetch payments for the schedule
    const { data: paymentsData, error: paymentsError } = await (serviceSubabase.from('registration_payments') as any)
      .select(
        `id, registration_id, payer_id, registration_type, payment_status, payment_proof_url, extracted_amount, extracted_reference,
         extracted_datetime, extracted_sender, extraction_confidence, created_at, required_amount, payment_note,
         registrations!registration_id(id, player_id, users:player_id(id, first_name, last_name)),
         payer:payer_id(first_name, last_name)`
      )
      .eq('schedule_id', scheduleId)
      .order('created_at', { ascending: false })

    if (paymentsError) throw paymentsError

    const payments = paymentsData ?? []
    const registrations: PaymentWithExtraction[] = payments.map((p: any) => ({
      id: p.id,
      player_id: p.registrations?.player_id ?? p.payer_id,
      users: p.registrations?.users ?? p.payer,
      payer: p.payer,
      payment_status: p.payment_status,
      payment_proof_url: p.payment_proof_url,
      extracted_amount: p.extracted_amount,
      extracted_reference: p.extracted_reference,
      extracted_datetime: p.extracted_datetime,
      extracted_sender: p.extracted_sender,
      extraction_confidence: p.extraction_confidence,
      required_amount: p.required_amount,
      registration_type: p.registration_type,
      created_at: p.created_at,
      payment_note: p.payment_note,
    }))

    return NextResponse.json(registrations)
  } catch (error) {
    logError('admin.payments.fetch_failed', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment records' },
      { status: 500 }
    )
  }
}
