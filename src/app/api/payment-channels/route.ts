import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: channels, error } = await (supabase.from('payment_channels') as any)
      .select('id, name, provider, account_number, account_holder_name, qr_code_url, is_active')
      .eq('is_active', true)
      .order('provider', { ascending: true })

    if (error) {
      console.error('[Payment Channels API] Query error:', error)
      return NextResponse.json({ error: 'Failed to fetch payment channels' }, { status: 500 })
    }

    return NextResponse.json({
      channels: channels || [],
    })
  } catch (error) {
    console.error('[Payment Channels API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
