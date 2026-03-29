import { describe, it, expect } from 'vitest'
import { onboardingSchema } from '../profile'

const validProfile = {
  first_name: 'John',
  last_name: 'Doe',
  birthday_month: 3,
  birthday_day: 15,
  birthday_year: 1990,
  gender: 'male',
  player_contact_number: '+639123456789',
  emergency_contact_name: 'Jane Doe',
  emergency_contact_relationship: 'spouse',
  emergency_contact_number: '+639234567890',
  skill_level: 'intermediate',
}

describe('onboardingSchema', () => {
  describe('valid inputs', () => {
    it('accepts valid complete profile', () => {
      const result = onboardingSchema.safeParse(validProfile)
      expect(result.success).toBe(true)
    })

    it('accepts profile without birthday_year (optional)', () => {
      const { birthday_year, ...profileWithoutYear } = validProfile
      const result = onboardingSchema.safeParse(profileWithoutYear)
      expect(result.success).toBe(true)
    })

    it('accepts all valid skill levels', () => {
      const skillLevels = ['developmental', 'developmental_plus', 'intermediate', 'intermediate_plus', 'advanced']
      skillLevels.forEach(level => {
        const result = onboardingSchema.safeParse({
          ...validProfile,
          skill_level: level,
        })
        expect(result.success).toBe(true)
      })
    })
  })

  describe('first_name field validation', () => {
    it('rejects empty first_name', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        first_name: '',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find(i => i.path.includes('first_name'))
        expect(issue?.message).toContain('Please enter your first name')
      }
    })

    it('rejects first_name exceeding 100 characters', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        first_name: 'a'.repeat(101),
      })
      expect(result.success).toBe(false)
    })

    it('accepts first_name of exactly 100 characters', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        first_name: 'a'.repeat(100),
      })
      expect(result.success).toBe(true)
    })
  })

  describe('last_name field validation', () => {
    it('rejects empty last_name', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        last_name: '',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find(i => i.path.includes('last_name'))
        expect(issue?.message).toContain('Please enter your last name')
      }
    })

    it('rejects last_name exceeding 100 characters', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        last_name: 'a'.repeat(101),
      })
      expect(result.success).toBe(false)
    })

    it('accepts last_name of exactly 100 characters', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        last_name: 'a'.repeat(100),
      })
      expect(result.success).toBe(true)
    })
  })

  describe('birthday_month field validation', () => {
    it('rejects month = 0', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        birthday_month: 0,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find(i => i.path.includes('birthday_month'))
        expect(issue?.message).toContain('Please select your birth month')
      }
    })

    it('rejects month = 13', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        birthday_month: 13,
      })
      expect(result.success).toBe(false)
    })

    it('accepts month = 1 (January)', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        birthday_month: 1,
      })
      expect(result.success).toBe(true)
    })

    it('accepts month = 12 (December)', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        birthday_month: 12,
      })
      expect(result.success).toBe(true)
    })

    it('rejects non-integer month', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        birthday_month: 3.5,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('birthday_day field validation', () => {
    it('rejects day = 0', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        birthday_day: 0,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find(i => i.path.includes('birthday_day'))
        expect(issue?.message).toContain('Please select your birth day')
      }
    })

    it('rejects day = 32', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        birthday_day: 32,
      })
      expect(result.success).toBe(false)
    })

    it('accepts day = 1', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        birthday_day: 1,
      })
      expect(result.success).toBe(true)
    })

    it('accepts day = 31', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        birthday_day: 31,
      })
      expect(result.success).toBe(true)
    })

    it('rejects non-integer day', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        birthday_day: 15.5,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('birthday_year field validation', () => {
    it('rejects year = 1899 (before 1900)', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        birthday_year: 1899,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find(i => i.path.includes('birthday_year'))
        expect(issue?.message).toContain('Year must be 1900 or later')
      }
    })

    it('rejects year = current year + 1 (future)', () => {
      const futureYear = new Date().getFullYear() + 1
      const result = onboardingSchema.safeParse({
        ...validProfile,
        birthday_year: futureYear,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find(i => i.path.includes('birthday_year'))
        expect(issue?.message).toContain('Year cannot be in the future')
      }
    })

    it('accepts year = 1900 (minimum boundary)', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        birthday_year: 1900,
      })
      expect(result.success).toBe(true)
    })

    it('accepts year = current year (today)', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        birthday_year: new Date().getFullYear(),
      })
      expect(result.success).toBe(true)
    })

    it('accepts year field omitted (optional)', () => {
      const { birthday_year, ...profileWithoutYear } = validProfile
      const result = onboardingSchema.safeParse(profileWithoutYear)
      expect(result.success).toBe(true)
    })

    it('rejects non-integer year', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        birthday_year: 1990.5,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('gender field validation', () => {
    it('rejects empty gender', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        gender: '',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find(i => i.path.includes('gender'))
        expect(issue?.message).toContain('Please enter your gender')
      }
    })

    it('rejects gender exceeding 100 characters', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        gender: 'a'.repeat(101),
      })
      expect(result.success).toBe(false)
    })

    it('accepts any non-empty string up to 100 characters', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        gender: 'custom-gender-value',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('player_contact_number field validation', () => {
    it('accepts valid Philippine number +63 + 10 digits', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        player_contact_number: '+639123456789',
      })
      expect(result.success).toBe(true)
    })

    it('rejects number without +63 prefix', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        player_contact_number: '09123456789',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find(i => i.path.includes('player_contact_number'))
        expect(issue?.message).toContain('valid Philippine mobile number')
      }
    })

    it('rejects number with +63 + 9 digits (too short)', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        player_contact_number: '+6391234567',
      })
      expect(result.success).toBe(false)
    })

    it('rejects number with +63 + 11 digits (too long)', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        player_contact_number: '+639123456789012',
      })
      expect(result.success).toBe(false)
    })

    it('rejects empty number', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        player_contact_number: '',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('emergency_contact_name field validation', () => {
    it('rejects empty emergency_contact_name', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        emergency_contact_name: '',
      })
      expect(result.success).toBe(false)
    })

    it('rejects emergency_contact_name exceeding 100 characters', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        emergency_contact_name: 'a'.repeat(101),
      })
      expect(result.success).toBe(false)
    })

    it('accepts emergency_contact_name of exactly 100 characters', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        emergency_contact_name: 'a'.repeat(100),
      })
      expect(result.success).toBe(true)
    })
  })

  describe('emergency_contact_relationship field validation', () => {
    it('rejects empty emergency_contact_relationship', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        emergency_contact_relationship: '',
      })
      expect(result.success).toBe(false)
    })

    it('rejects emergency_contact_relationship exceeding 50 characters', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        emergency_contact_relationship: 'a'.repeat(51),
      })
      expect(result.success).toBe(false)
    })

    it('accepts emergency_contact_relationship of exactly 50 characters', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        emergency_contact_relationship: 'a'.repeat(50),
      })
      expect(result.success).toBe(true)
    })
  })

  describe('emergency_contact_number field validation', () => {
    it('accepts valid Philippine emergency contact number', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        emergency_contact_number: '+639234567890',
      })
      expect(result.success).toBe(true)
    })

    it('rejects number without +63 prefix', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        emergency_contact_number: '09234567890',
      })
      expect(result.success).toBe(false)
    })

    it('rejects number with +63 + 9 digits', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        emergency_contact_number: '+6392345678',
      })
      expect(result.success).toBe(false)
    })

    it('rejects empty number', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        emergency_contact_number: '',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('skill_level field validation', () => {
    it('rejects invalid skill_level', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        skill_level: 'unknown_level',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find(i => i.path.includes('skill_level'))
        expect(issue?.message).toContain('Please choose your skill level')
      }
    })

    it('rejects empty skill_level', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        skill_level: '',
      })
      expect(result.success).toBe(false)
    })

    it('accepts developmental', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        skill_level: 'developmental',
      })
      expect(result.success).toBe(true)
    })

    it('accepts developmental_plus', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        skill_level: 'developmental_plus',
      })
      expect(result.success).toBe(true)
    })

    it('accepts intermediate', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        skill_level: 'intermediate',
      })
      expect(result.success).toBe(true)
    })

    it('accepts intermediate_plus', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        skill_level: 'intermediate_plus',
      })
      expect(result.success).toBe(true)
    })

    it('accepts advanced', () => {
      const result = onboardingSchema.safeParse({
        ...validProfile,
        skill_level: 'advanced',
      })
      expect(result.success).toBe(true)
    })
  })
})
