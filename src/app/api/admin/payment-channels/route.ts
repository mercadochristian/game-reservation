import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { logActivity, logError } from '@/lib/logger'
import type { Database } from '@/types/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const service = createServiceClient()
    const { data, error } = await (service.from('payment_channels')
      .insert([body as Database['public']['Tables']['payment_channels']['Insert']])
      .select() as any)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (data?.[0]) {
      await logActivity('payment_channel.create', user.id, {
        channel_id: data[0].id,
        provider: body.provider,
        name: body.name,
        has_qr: !!body.qr_code_url,
      })
    }

    revalidatePath('/dashboard/payment-channels')

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const service = createServiceClient()
    const { error } = await service.from('payment_channels').update(updateData).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await logActivity('payment_channel.update', user.id, {
      channel_id: id,
      provider: updateData.provider,
      name: updateData.name,
      qr_updated: !!updateData.qr_code_url,
    })

    revalidatePath('/dashboard/payment-channels')

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Get channel info before deleting for logging
    const { data: channel } = await supabase.from('payment_channels').select('provider, name').eq('id', id).single()

    const service = createServiceClient()
    const { error } = await service.from('payment_channels').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (channel) {
      await logActivity('payment_channel.delete', user.id, {
        channel_id: id,
        provider: channel.provider,
        name: channel.name,
      })
    }

    revalidatePath('/dashboard/payment-channels')

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
