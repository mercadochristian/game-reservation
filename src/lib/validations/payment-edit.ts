import { z } from 'zod'

export const paymentEditSchema = z.object({
  extracted_amount: z.number().positive('Amount must be greater than 0').nullable().optional(),
  extracted_reference: z.string().max(255).nullable().optional(),
  extracted_datetime: z.string().datetime().nullable().optional(),
  extracted_sender: z.string().max(255).nullable().optional(),
  payment_note: z.string().max(200).nullable().optional(),
})

export type PaymentEditFormData = z.infer<typeof paymentEditSchema>
