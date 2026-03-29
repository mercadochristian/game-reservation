import { z } from 'zod'
import type { UserRole, SkillLevel } from '@/types'

const ROLES = ['super_admin', 'admin', 'player', 'facilitator'] as const satisfies UserRole[]
const SKILL_LEVELS = ['developmental', 'developmental_plus', 'intermediate', 'intermediate_plus', 'advanced'] as const satisfies SkillLevel[]

export const userEditSchema = z.object({
  first_name: z
    .string()
    .min(1, 'First name cannot be blank')
    .max(100, 'First name must be 100 characters or less')
    .nullish(),
  last_name: z
    .string()
    .min(1, 'Last name cannot be blank')
    .max(100, 'Last name must be 100 characters or less')
    .nullish(),
  email: z
    .string()
    .email('Invalid email address')
    .min(1, 'Email is required')
    .max(255, 'Email must be 255 characters or less')
    .optional(),
  // Note: Phone validation is permissive. Admin can set any format; players must follow Philippine format (profile-edit.ts)
  player_contact_number: z
    .string()
    .max(20, 'Phone number must be 20 characters or less')
    .nullish(),
  emergency_contact_name: z
    .string()
    .max(100, 'Emergency contact name must be 100 characters or less')
    .nullish(),
  emergency_contact_relationship: z
    .string()
    .max(50, 'Relationship must be 50 characters or less')
    .nullish(),
  emergency_contact_number: z
    .string()
    .max(20, 'Emergency contact phone must be 20 characters or less')
    .nullish(),
  role: z.enum(ROLES).optional(),
  skill_level: z.enum(SKILL_LEVELS).nullish(),
})

export type UserEditData = z.infer<typeof userEditSchema>

/**
 * Validate edit data against schema
 */
export function validateUserEditData(
  data: unknown,
): { valid: true; data: UserEditData } | { valid: false; errors: Record<string, string> } {
  const result = userEditSchema.safeParse(data)

  if (!result.success) {
    const errors: Record<string, string> = {}
    result.error.issues.forEach((issue) => {
      const path = issue.path.join('.')
      errors[path] = issue.message
    })
    return { valid: false, errors }
  }

  return { valid: true, data: result.data }
}
