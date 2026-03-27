import { z } from 'zod'

export const profileEditSchema = z.object({
  first_name: z.string('Please enter your first name')
    .min(1, 'Please enter your first name')
    .max(100, 'First name must be 100 characters or less'),
  last_name: z.string('Please enter your last name')
    .min(1, 'Please enter your last name')
    .max(100, 'Last name must be 100 characters or less'),
  birthday_month: z
    .number('Please select your birth month')
    .int('Please select your birth month')
    .min(1, 'Please select your birth month')
    .max(12, 'Please select your birth month'),
  birthday_day: z
    .number('Please select your birth day')
    .int('Please select your birth day')
    .min(1, 'Please select your birth day')
    .max(31, 'Please select your birth day'),
  birthday_year: z
    .number('Please enter a valid year')
    .int('Please enter a valid year')
    .min(1900, 'Year must be 1900 or later')
    .max(new Date().getFullYear(), 'Year cannot be in the future')
    .optional(),
  gender: z.string('Please enter your gender')
    .min(1, 'Please enter your gender')
    .max(100, 'Gender must be 100 characters or less'),
  player_contact_number: z.string('Please enter your mobile number')
    .min(1, 'Please enter your mobile number')
    .regex(/^\+63\d{10}$/, 'Enter a valid Philippine mobile number (e.g. 912 345 6789)'),
  emergency_contact_name: z.string('Please enter your emergency contact\'s name')
    .min(1, 'Please enter your emergency contact\'s name')
    .max(100, 'Name is too long — please keep it under 100 characters'),
  emergency_contact_relationship: z.string('Please enter your relationship to this contact')
    .min(1, 'Please enter your relationship to this contact')
    .max(50, 'Relationship is too long — please keep it under 50 characters'),
  emergency_contact_number: z.string('Please enter your emergency contact\'s number')
    .min(1, 'Please enter your emergency contact\'s number')
    .regex(/^\+63\d{10}$/, 'Enter a valid Philippine mobile number (e.g. 912 345 6789)'),
})

export type ProfileEditFormData = z.infer<typeof profileEditSchema>
