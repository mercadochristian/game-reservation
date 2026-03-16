import { z } from 'zod'

const SKILL_LEVELS = [
  'developmental',
  'developmental_plus',
  'intermediate',
  'intermediate_plus',
  'advanced',
] as const

export const onboardingSchema = z.object({
  birthday_month: z
    .number({ required_error: 'Please select a month', invalid_type_error: 'Please select a month' })
    .int()
    .min(1, 'Month must be between 1 and 12')
    .max(12, 'Month must be between 1 and 12'),
  birthday_day: z
    .number({ required_error: 'Please select a day', invalid_type_error: 'Please select a day' })
    .int()
    .min(1, 'Day must be between 1 and 31')
    .max(31, 'Day must be between 1 and 31'),
  birthday_year: z
    .number()
    .int('Year must be a whole number')
    .min(1900, 'Year must be 1900 or later')
    .max(new Date().getFullYear(), 'Year cannot be in the future')
    .nullable()
    .optional(),
  gender: z.string().min(1, 'Gender is required').max(100, 'Gender must be less than 100 characters'),
  emergency_contact_name: z
    .string()
    .min(1, 'Emergency contact name is required')
    .max(100, 'Name must be less than 100 characters'),
  emergency_contact_relationship: z
    .string()
    .min(1, 'Relationship is required')
    .max(50, 'Relationship must be less than 50 characters'),
  emergency_contact_number: z
    .string()
    .regex(/^\+63\d{10}$/, 'Enter a valid 10-digit Philippine mobile number'),
  skill_level: z.enum(SKILL_LEVELS, {
    errorMap: () => ({ message: 'Please select your skill level' }),
  }),
})

export type OnboardingFormData = z.infer<typeof onboardingSchema>
