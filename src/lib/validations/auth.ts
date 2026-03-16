import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(72, 'Password must be fewer than 72 characters'),
})

export const magicLinkSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
})

export type LoginFormData = z.infer<typeof loginSchema>
export type MagicLinkFormData = z.infer<typeof magicLinkSchema>
