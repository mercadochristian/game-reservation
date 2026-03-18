import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string('Please enter your email address')
    .min(1, 'Please enter your email address')
    .email('Please enter a valid email address'),
  password: z.string('Please enter your password')
    .min(1, 'Please enter your password')
    .min(6, 'Password must be at least 6 characters')
    .max(72, 'Password must be fewer than 72 characters'),
})

export type LoginFormData = z.infer<typeof loginSchema>
