import { describe, it, expect } from 'vitest'
import { groupPlayerSchema, groupRegistrationSchema } from '../group-registration'

const validExistingPlayer = {
  type: 'existing',
  user_id: '550e8400-e29b-41d4-a716-446655440000',
  preferred_position: 'setter',
}

const validGuestPlayer = {
  type: 'guest',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  preferred_position: 'open_spiker',
}

const validGroupRegistration = {
  schedule_id: '550e8400-e29b-41d4-a716-446655440001',
  payment_proof_path: '/uploads/proof.jpg',
  registration_mode: 'group',
  players: [validExistingPlayer, validGuestPlayer],
}

describe('groupPlayerSchema', () => {
  describe('existing player type', () => {
    it('accepts valid existing player', () => {
      const result = groupPlayerSchema.safeParse(validExistingPlayer)
      expect(result.success).toBe(true)
    })

    it('rejects non-UUID user_id', () => {
      const result = groupPlayerSchema.safeParse({
        type: 'existing',
        user_id: 'not-a-uuid',
        preferred_position: 'setter',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find(i => i.path.includes('user_id'))
        expect(issue?.message).toContain('valid UUID')
      }
    })

    it('rejects invalid preferred_position', () => {
      const result = groupPlayerSchema.safeParse({
        type: 'existing',
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        preferred_position: 'unknown',
      })
      expect(result.success).toBe(false)
    })

    it('accepts all valid position enums', () => {
      const positions = ['open_spiker', 'opposite_spiker', 'middle_blocker', 'setter', 'middle_setter']
      positions.forEach(pos => {
        const result = groupPlayerSchema.safeParse({
          type: 'existing',
          user_id: '550e8400-e29b-41d4-a716-446655440000',
          preferred_position: pos,
        })
        expect(result.success).toBe(true)
      })
    })
  })

  describe('guest player type', () => {
    it('accepts valid guest player', () => {
      const result = groupPlayerSchema.safeParse(validGuestPlayer)
      expect(result.success).toBe(true)
    })

    it('accepts guest player with phone', () => {
      const result = groupPlayerSchema.safeParse({
        ...validGuestPlayer,
        phone: '+639123456789',
      })
      expect(result.success).toBe(true)
    })

    it('accepts guest player without phone (optional)', () => {
      const result = groupPlayerSchema.safeParse(validGuestPlayer)
      expect(result.success).toBe(true)
    })

    it('rejects invalid email format', () => {
      const result = groupPlayerSchema.safeParse({
        type: 'guest',
        first_name: 'John',
        last_name: 'Doe',
        email: 'not-an-email',
        preferred_position: 'setter',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find(i => i.path.includes('email'))
        expect(issue?.message).toContain('Invalid email address')
      }
    })

    it('rejects empty first_name', () => {
      const result = groupPlayerSchema.safeParse({
        type: 'guest',
        first_name: '',
        last_name: 'Doe',
        email: 'john@example.com',
        preferred_position: 'setter',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find(i => i.path.includes('first_name'))
        expect(issue?.message).toContain('First name is required')
      }
    })

    it('rejects empty last_name', () => {
      const result = groupPlayerSchema.safeParse({
        type: 'guest',
        first_name: 'John',
        last_name: '',
        email: 'john@example.com',
        preferred_position: 'setter',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find(i => i.path.includes('last_name'))
        expect(issue?.message).toContain('Last name is required')
      }
    })

    it('rejects first_name exceeding 100 characters', () => {
      const result = groupPlayerSchema.safeParse({
        type: 'guest',
        first_name: 'a'.repeat(101),
        last_name: 'Doe',
        email: 'john@example.com',
        preferred_position: 'setter',
      })
      expect(result.success).toBe(false)
    })

    it('rejects last_name exceeding 100 characters', () => {
      const result = groupPlayerSchema.safeParse({
        type: 'guest',
        first_name: 'John',
        last_name: 'a'.repeat(101),
        email: 'john@example.com',
        preferred_position: 'setter',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('union type behavior', () => {
    it('rejects unknown type value', () => {
      const result = groupPlayerSchema.safeParse({
        type: 'unknown',
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        preferred_position: 'setter',
      })
      expect(result.success).toBe(false)
    })

    it('rejects type value not matching either branch', () => {
      const result = groupPlayerSchema.safeParse({
        type: 'admin',
        email: 'test@test.com',
      })
      expect(result.success).toBe(false)
    })
  })
})

describe('groupRegistrationSchema', () => {
  describe('valid inputs', () => {
    it('accepts valid group registration with 2 players', () => {
      const result = groupRegistrationSchema.safeParse(validGroupRegistration)
      expect(result.success).toBe(true)
    })

    it('accepts with 3 players', () => {
      const result = groupRegistrationSchema.safeParse({
        ...validGroupRegistration,
        players: [validExistingPlayer, validGuestPlayer, validGuestPlayer],
      })
      expect(result.success).toBe(true)
    })

    it('accepts registration_mode: group', () => {
      const result = groupRegistrationSchema.safeParse({
        ...validGroupRegistration,
        registration_mode: 'group',
      })
      expect(result.success).toBe(true)
    })

    it('accepts registration_mode: team', () => {
      const result = groupRegistrationSchema.safeParse({
        ...validGroupRegistration,
        registration_mode: 'team',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('schedule_id field validation', () => {
    it('rejects non-UUID schedule_id', () => {
      const result = groupRegistrationSchema.safeParse({
        ...validGroupRegistration,
        schedule_id: 'not-a-uuid',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find(i => i.path.includes('schedule_id'))
        expect(issue?.message).toContain('Schedule ID must be a valid UUID')
      }
    })
  })

  describe('payment_proof_path field validation', () => {
    it('rejects empty payment_proof_path', () => {
      const result = groupRegistrationSchema.safeParse({
        ...validGroupRegistration,
        payment_proof_path: '',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find(i => i.path.includes('payment_proof_path'))
        expect(issue?.message).toContain('Payment proof path is required')
      }
    })
  })

  describe('registration_mode field validation', () => {
    it('rejects invalid registration_mode', () => {
      const result = groupRegistrationSchema.safeParse({
        ...validGroupRegistration,
        registration_mode: 'invalid',
      })
      expect(result.success).toBe(false)
    })

    it('rejects registration_mode: single', () => {
      const result = groupRegistrationSchema.safeParse({
        ...validGroupRegistration,
        registration_mode: 'single',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('players field validation', () => {
    it('rejects 1 player (minimum is 2)', () => {
      const result = groupRegistrationSchema.safeParse({
        ...validGroupRegistration,
        players: [validExistingPlayer],
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find(i => i.path.includes('players'))
        expect(issue?.message).toContain('At least 2 players required')
      }
    })

    it('rejects empty players array', () => {
      const result = groupRegistrationSchema.safeParse({
        ...validGroupRegistration,
        players: [],
      })
      expect(result.success).toBe(false)
    })

    it('accepts 2+ players with mixed existing and guest types', () => {
      const result = groupRegistrationSchema.safeParse({
        ...validGroupRegistration,
        players: [
          validExistingPlayer,
          validGuestPlayer,
          validGuestPlayer,
        ],
      })
      expect(result.success).toBe(true)
    })

    it('rejects players array with invalid player object', () => {
      const result = groupRegistrationSchema.safeParse({
        ...validGroupRegistration,
        players: [
          validExistingPlayer,
          {
            type: 'invalid_type',
          },
        ],
      })
      expect(result.success).toBe(false)
    })
  })
})
