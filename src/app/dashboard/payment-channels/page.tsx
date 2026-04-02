import { createServiceClient } from '@/lib/supabase/service'
import type { PaymentChannel } from '@/types'
import { PaymentChannelsClient } from './payment-channels-client'

export default async function PaymentChannelsPage() {
  const supabase = createServiceClient()
  const { data } = await supabase.from('payment_channels')
    .select('*')
    .order('created_at', { ascending: false })

  const initialChannels: PaymentChannel[] = data ?? []

  return <PaymentChannelsClient initialChannels={initialChannels} />
}
