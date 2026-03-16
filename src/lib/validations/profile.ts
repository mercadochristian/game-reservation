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
    .number({ invalid_type_error: 'Please select your birth month' })
    .int('Please select your birth month')
    .min(1, 'Please select your birth month')
    .max(12, 'Please select your birth month')
    .nullable()
    .optional(),
  birthday_day: z
    .number({ invalid_type_error: 'Please select your birth day' })
    .int('Please select your birth day')
    .min(1, 'Please select your birth day')
    .max(31, 'Please select your birth day')
    .nullable()
    .optional(),
  birthday_year: z
    .number({ invalid_type_error: 'Please enter a valid year' })
    .int('Please enter a valid year')
    .min(1900, 'Year must be 1900 or later')
    .max(new Date().getFullYear(), 'Year cannot be in the future')
    .nullable()
    .optional(),
  gender: z.string({
    required_error: 'Please enter your gender',
    invalid_type_error: 'Please enter your gender',
  })
    .min(1, 'Please enter your gender')
    .max(100, 'Gender must be 100 characters or less'),
  player_contact_number: z.string({
    required_error: 'Please enter your mobile number',
    invalid_type_error: 'Please enter your mobile number',
  })
    .min(1, 'Please enter your mobile number')
    .regex(/^\+63\d{10}$/, 'Enter a valid Philippine mobile number (e.g. 912 345 6789)'),
  emergency_contact_name: z.string({
    required_error: 'Please enter your emergency contact\'s name',
    invalid_type_error: 'Please enter your emergency contact\'s name',
  })
    .min(1, 'Please enter your emergency contact\'s name')
    .max(100, 'Name is too long — please keep it under 100 characters'),
  emergency_contact_relationship: z.string({
    required_error: 'Please enter your relationship to this contact',
    invalid_type_error: 'Please enter your relationship to this contact',
  })
    .min(1, 'Please enter your relationship to this contact')
    .max(50, 'Relationship is too long — please keep it under 50 characters'),
  emergency_contact_number: z.string({
    required_error: 'Please enter your emergency contact\'s number',
    invalid_type_error: 'Please enter your emergency contact\'s number',
  })
    .min(1, 'Please enter your emergency contact\'s number')
    .regex(/^\+63\d{10}$/, 'Enter a valid Philippine mobile number (e.g. 912 345 6789)'),
  skill_level: z.string({
    required_error: 'Please choose your skill level',
    invalid_type_error: 'Please choose your skill level',
  })
    .min(1, 'Please choose your skill level')
    .refine((val) => SKILL_LEVELS.includes(val as any), {
      message: 'Please choose your skill level',
    }) as any as z.ZodType<typeof SKILL_LEVELS[number]>,
})

export type OnboardingFormData = z.infer<typeof onboardingSchema>
