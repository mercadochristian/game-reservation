import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { scanQrSchema } from '@/lib/validations/scanner'
import { logError } from '@/lib/logger'
import { z } from 'zod'

type ScannerRole = 'admin' | 'super_admin' | 'facilitator'

const ALLOWED_ROLES: ScannerRole[] = ['admin', 'super_admin', 'facilitator']

type RegistrationScanRow = {
  id: string
  attended: boolean
  schedule_id: string
  player_id: string
  registration_payments?: Array<{
    payment_status: string
  }> | {
    payment_status: string
  }
}

type PaymentRow = {
  required_amount: number
  payment_note: string | null
}

const uuidSchema = z.string().uuid()

function extractUuidFromScanValue(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null

  if (uuidSchema.safeParse(raw).success) return raw

  // URL payload support (e.g., ?qr_token=<uuid> or trailing /<uuid>)
  try {
    const parsedUrl = new URL(raw)
    const queryCandidates = ['qr_token', 'token', 'registration_id', 'id']
    for (const key of queryCandidates) {
      const value = parsedUrl.searchParams.get(key)
      if (value && uuidSchema.safeParse(value).success) return value
    }

    const tail = parsedUrl.pathname.split('/').filter(Boolean).at(-1)
    if (tail && uuidSchema.safeParse(tail).success) return tail
  } catch {
    // Not a URL payload
  }

  // JSON payload support (e.g., {"qr_token":"<uuid>"})
  try {
    const parsedJson = JSON.parse(raw) as Record<string, unknown>
    const jsonCandidates = ['qr_token', 'token', 'registration_id', 'id']
    for (const key of jsonCandidates) {
      const value = parsedJson[key]
      if (typeof value === 'string' && uuidSchema.safeParse(value).success) return value
    }
  } catch {
    // Not JSON payload
  }

  return null
}

function isNoRowError(error: any): boolean {
  if (!error) return false
  const message = `${error.code ?? ''} ${error.details ?? ''} ${error.message ?? ''}`
  return error.code === 'PGRST116' || /0 rows|no rows|results contain 0 rows/i.test(message)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const parsed = scanQrSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid QR token' },
        { status: 400 },
      )
    }

    const extractedUuid = extractUuidFromScanValue(parsed.data.qr_token)
    if (!extractedUuid) {
      return NextResponse.json({ error: 'QR payload does not contain a valid UUID token' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', authUser.id)
      .single() as { data: { role: string } | null; error: any }

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!ALLOWED_ROLES.includes(currentUser.role as ScannerRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const serviceClient = createServiceClient()

    async function lookupRegistrationBy(
      field: 'qr_token' | 'id',
      value: string,
    ): Promise<{ data: RegistrationScanRow | null; error: any }> {
      const serviceAttempt = serviceClient
        .from('registrations')
        .select('id, attended, schedule_id, player_id, registration_payments(payment_status)')
        .eq(field, value)
        .maybeSingle() as any

      if (!serviceAttempt.error || isNoRowError(serviceAttempt.error)) {
        return serviceAttempt
      }

      // Fallback to authenticated server client when service-role lookup fails.
      const serverAttempt = supabase
        .from('registrations')
        .select('id, attended, schedule_id, player_id, registration_payments(payment_status)')
        .eq(field, value)
        .maybeSingle() as any

      if (!serverAttempt.error || isNoRowError(serverAttempt.error)) {
        return serverAttempt
      }

      return serviceAttempt
    }

    const firstLookup = await lookupRegistrationBy('qr_token', extractedUuid)
    let registration = firstLookup.data
    if (firstLookup.error && !isNoRowError(firstLookup.error)) {
      void logError('scanner.scan.lookup_failed', firstLookup.error, authUser.id, { qrToken: parsed.data.qr_token })
      return NextResponse.json({ error: 'Failed to lookup registration' }, { status: 500 })
    }

    // Backward compatibility: some older QR payloads may contain registration.id
    if (!registration) {
      const fallback = await lookupRegistrationBy('id', extractedUuid)
      if (fallback.error && !isNoRowError(fallback.error)) {
        void logError('scanner.scan.lookup_fallback_failed', fallback.error, authUser.id, { token: extractedUuid })
        return NextResponse.json({ error: 'Failed to lookup registration' }, { status: 500 })
      }
      registration = fallback.data
    }

    if (!registration) {
      return NextResponse.json({ error: 'Registration not found for this QR token' }, { status: 404 })
    }

    // Validate that the registration belongs to the requested schedule
    if (registration.schedule_id !== parsed.data.schedule_id) {
      return NextResponse.json(
        { error: 'This registration does not belong to the selected schedule' },
        { status: 403 },
      )
    }

    // Extract payment status from registration_payments relationship
    const paymentData = Array.isArray(registration.registration_payments)
      ? registration.registration_payments[0]
      : registration.registration_payments
    const paymentStatus = paymentData?.payment_status || 'unknown'

    // Check payment status - only allow attendance marking if payment is approved
    if (paymentStatus !== 'paid') {
      // Fetch payment details for the response
      const paymentResult = await serviceClient
        .from('registration_payments')
        .select('required_amount, payment_note')
        .eq('registration_id', registration.id)
        .maybeSingle() as { data: PaymentRow | null; error: any }

      if (!paymentResult.error && paymentResult.data) {
        return NextResponse.json(
          {
            error: 'Payment not approved',
            payment_status: paymentStatus,
            required_amount: paymentResult.data.required_amount,
            payment_note: paymentResult.data.payment_note,
          },
          { status: 402 },
        )
      }

      // Fallback if payment lookup fails
      return NextResponse.json(
        {
          error: 'Payment not approved',
          payment_status: paymentStatus,
        },
        { status: 402 },
      )
    }

    const [scheduleResult, playerResult] = await Promise.all([
      (serviceClient
        .from('schedules')
        .select('id, start_time')
        .eq('id', registration.schedule_id)
        .maybeSingle() as any),
      (serviceClient
        .from('users')
        .select('id, first_name, last_name')
        .eq('id', registration.player_id)
        .maybeSingle() as any),
    ])

    const schedule = scheduleResult.data
    const player = playerResult.data

    if (!registration.attended) {
      const serviceUpdate = await (serviceClient
        .from('registrations') as any)
        .update({ attended: true })
        .eq('id', registration.id)
      let updateError = serviceUpdate.error

      if (updateError) {
        // Fallback to authenticated server client if service-role update fails.
        const serverUpdate = await (supabase
          .from('registrations') as any)
          .update({ attended: true })
          .eq('id', registration.id)
        updateError = serverUpdate.error
      }

      if (updateError) {
        void logError('scanner.scan.update_failed', updateError, authUser.id, { registrationId: registration.id })
        return NextResponse.json({ error: 'Failed to mark attendance' }, { status: 500 })
      }
    }

    return NextResponse.json(
      {
        registration_id: registration.id,
        schedule,
        player,
        payment_status: paymentStatus,
        attended: true,
        already_attended: registration.attended,
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      },
    )
  } catch (error) {
    void logError('scanner.scan.unhandled', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
