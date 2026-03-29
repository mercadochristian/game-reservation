import { z } from 'zod'

export const userEditSchema = z.object({
  first_name: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name must be 100 characters or less')
    .optional()
    .or(z.null()),
  last_name: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be 100 characters or less')
    .optional()
    .or(z.null()),
  email: z
    .string()
    .email('Invalid email address')
    .min(1, 'Email is required')
    .max(255, 'Email must be 255 characters or less')
    .optional(),
  player_contact_number: z
    .string()
    .max(20, 'Phone number must be 20 characters or less')
    .optional()
    .or(z.null()),
  emergency_contact_name: z
    .string()
    .max(100, 'Emergency contact name must be 100 characters or less')
    .optional()
    .or(z.null()),
  emergency_contact_relationship: z
    .string()
    .max(100, 'Relationship must be 100 characters or less')
    .optional()
    .or(z.null()),
  emergency_contact_number: z
    .string()
    .max(20, 'Emergency contact phone must be 20 characters or less')
    .optional()
    .or(z.null()),
  role: z.enum(['admin', 'player', 'facilitator', 'super_admin']).optional(),
  skill_level: z
    .enum([
      'developmental',
      'developmental_plus',
      'intermediate',
      'intermediate_plus',
      'advanced',
    ])
    .optional()
    .or(z.null()),
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
