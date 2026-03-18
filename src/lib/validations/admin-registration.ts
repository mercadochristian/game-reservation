import { z } from 'zod'
import { groupPlayerSchema } from './group-registration'

export const adminRegistrationSchema = z.object({
  schedule_id: z.string().uuid('Schedule ID must be a valid UUID'),
  registration_mode: z.enum(['single', 'group', 'team']),
  payment_status: z.enum(['pending', 'review', 'paid', 'rejected']).default('pending'),
  team_preference: z.enum(['shuffle', 'teammate']).default('shuffle'),
  players: z.array(groupPlayerSchema).min(1, 'At least 1 player required'),
})

export type AdminRegistrationRequest = z.infer<typeof adminRegistrationSchema>

// API response (same as group registration)
export const adminRegistrationResponseSchema = z.object({
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

export type AdminRegistrationResponse = z.infer<typeof adminRegistrationResponseSchema>
