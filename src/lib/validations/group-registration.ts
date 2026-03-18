import { z } from 'zod'
import { PlayerPosition } from '@/types'

// Individual player entry in a group registration
const existingPlayerSchema = z.object({
  type: z.literal('existing'),
  user_id: z.string().uuid('User ID must be a valid UUID'),
  preferred_position: z.enum(['open_spiker', 'opposite_spiker', 'middle_blocker', 'setter', 'middle_setter'] as const),
})

const guestPlayerSchema = z.object({
  type: z.literal('guest'),
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  preferred_position: z.enum(['open_spiker', 'opposite_spiker', 'middle_blocker', 'setter', 'middle_setter'] as const),
})

export const groupPlayerSchema = z.union([existingPlayerSchema, guestPlayerSchema])
export type GroupPlayer = z.infer<typeof groupPlayerSchema>

export const groupRegistrationSchema = z.object({
  schedule_id: z.string().uuid('Schedule ID must be a valid UUID'),
  payment_proof_path: z.string().min(1, 'Payment proof path is required'),
  registration_mode: z.enum(['group', 'team']),
  players: z.array(groupPlayerSchema).min(2, 'At least 2 players required (you + 1 additional)'),
})

export type GroupRegistrationRequest = z.infer<typeof groupRegistrationSchema>

// API response
export const groupRegistrationResponseSchema = z.object({
  results: z.array(
    z.object({
      player_index: z.number(),
      player_email_or_name: z.string(),
      success: z.boolean(),
      user_id: z.string().uuid().optional(),
      error: z.string().optional(),
    })
  ),
})

export type GroupRegistrationResponse = z.infer<typeof groupRegistrationResponseSchema>
