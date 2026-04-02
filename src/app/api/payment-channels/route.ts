import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'
import { getActivePaymentChannels } from '@/lib/queries'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: channels, error } = await getActivePaymentChannels(supabase)

    if (error) {
      void logError('payment_channels.query_failed', error)
      return NextResponse.json({ error: 'Failed to fetch payment channels' }, { status: 500 })
    }

    return NextResponse.json({
      channels: channels || [],
    }, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
    })
  } catch (error) {
    void logError('payment_channels.unhandled', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
