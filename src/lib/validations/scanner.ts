import { z } from 'zod'

export const scanQrSchema = z.object({
  qr_token: z
    .string()
    .min(1, 'QR token is required'),
  schedule_id: z
    .string()
    .uuid('Schedule ID must be a valid UUID'),
})

export type ScanQrInput = z.infer<typeof scanQrSchema>
