import { describe, it, expect } from 'vitest'
import { validateUserEditData } from '../user-edit'

describe('user-edit', () => {
  describe('validateUserEditData', () => {
    it('should accept valid data with all fields', () => {
      const data = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        player_contact_number: '123456789',
        emergency_contact_name: 'Jane',
        emergency_contact_relationship: 'Sister',
        emergency_contact_number: '987654321',
        role: 'player',
        skill_level: 'intermediate',
      }
      const result = validateUserEditData(data)
      expect(result.valid).toBe(true)
      if (result.valid) {
        expect(result.data.first_name).toBe('John')
        expect(result.data.last_name).toBe('Doe')
        expect(result.data.email).toBe('john@example.com')
      }
    })

    it('should accept data with only some fields', () => {
      const data = { first_name: 'Jane', skill_level: 'advanced' }
      const result = validateUserEditData(data)
      expect(result.valid).toBe(true)
    })

    it('should accept empty object', () => {
      const result = validateUserEditData({})
      expect(result.valid).toBe(true)
    })

    it('should reject invalid email', () => {
      const data = { email: 'not-an-email' }
      const result = validateUserEditData(data)
      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.errors['email']).toContain('Invalid')
      }
    })

    it('should reject first_name longer than 100 chars', () => {
      const data = { first_name: 'a'.repeat(101) }
      const result = validateUserEditData(data)
      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.errors['first_name']).toContain('100')
      }
    })

    it('should reject invalid role', () => {
      const data = { role: 'invalid' }
      const result = validateUserEditData(data)
      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.errors['role']).toBeDefined()
      }
    })

    it('should reject invalid skill_level', () => {
      const data = { skill_level: 'expert' }
      const result = validateUserEditData(data)
      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.errors['skill_level']).toBeDefined()
      }
    })

    it('should accept null values for nullable fields', () => {
      const data = {
        first_name: null,
        last_name: null,
        player_contact_number: null,
        skill_level: null,
      }
      const result = validateUserEditData(data)
      expect(result.valid).toBe(true)
    })
  })
})
