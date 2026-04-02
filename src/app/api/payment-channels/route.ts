import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActivePaymentChannels } from '@/lib/queries'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: channels, error } = await getActivePaymentChannels(supabase)

    if (error) {
      console.error('[Payment Channels API] Query error:', error)
      return NextResponse.json({ error: 'Failed to fetch payment channels' }, { status: 500 })
    }

    return NextResponse.json({
      channels: channels || [],
    }, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
    })
  } catch (error) {
    console.error('[Payment Channels API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
