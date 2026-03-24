import { z } from 'zod'

export const PAYMENT_PROVIDERS = [
  'GCash',
  'Maya',
  'BPI',
  'BDO',
  'Metrobank',
  'UnionBank',
  'Other',
] as const

export const paymentChannelSchema = z.object({
  name: z.string().min(1, 'Channel name is required').max(255),
  provider: z.enum(PAYMENT_PROVIDERS).catch(PAYMENT_PROVIDERS[0]),
  account_number: z.string().min(1, 'Account number is required').max(100),
  account_holder_name: z
    .string()
    .min(1, 'Account holder name is required')
    .max(255),
  is_active: z.boolean(),
})

export type PaymentChannelFormData = z.infer<typeof paymentChannelSchema>
