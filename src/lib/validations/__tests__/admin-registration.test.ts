import { describe, it, expect } from 'vitest'
import { adminRegistrationSchema } from '../admin-registration'

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
  skill_level: 'intermediate',
}

const validAdminRegistration = {
  schedule_id: '550e8400-e29b-41d4-a716-446655440001',
  registration_mode: 'single',
  players: [validExistingPlayer],
}

describe('adminRegistrationSchema', () => {
  describe('valid inputs', () => {
    it('accepts valid admin registration with single mode and 1 player', () => {
      const result = adminRegistrationSchema.safeParse(validAdminRegistration)
      expect(result.success).toBe(true)
    })

    it('accepts group mode with 2 players', () => {
      const result = adminRegistrationSchema.safeParse({
        schedule_id: '550e8400-e29b-41d4-a716-446655440001',
        registration_mode: 'group',
        players: [validExistingPlayer, validGuestPlayer],
      })
      expect(result.success).toBe(true)
    })

    it('accepts team mode with 6 players', () => {
      const result = adminRegistrationSchema.safeParse({
        schedule_id: '550e8400-e29b-41d4-a716-446655440001',
        registration_mode: 'team',
        players: [
          validExistingPlayer,
          validGuestPlayer,
          validGuestPlayer,
          validGuestPlayer,
          validGuestPlayer,
          validGuestPlayer,
        ],
      })
      expect(result.success).toBe(true)
    })
  })

  describe('default values', () => {
    it('defaults payment_status to pending when omitted', () => {
      const result = adminRegistrationSchema.safeParse(validAdminRegistration)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.payment_status).toBe('pending')
      }
    })

    it('defaults team_preference to shuffle when omitted', () => {
      const result = adminRegistrationSchema.safeParse(validAdminRegistration)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.team_preference).toBe('shuffle')
      }
    })

    it('accepts explicit payment_status values', () => {
      const statuses = ['pending', 'review', 'paid', 'rejected']
      statuses.forEach(status => {
        const result = adminRegistrationSchema.safeParse({
          ...validAdminRegistration,
          payment_status: status,
        })
        expect(result.success).toBe(true)
      })
    })

    it('accepts explicit team_preference values', () => {
      const prefs = ['shuffle', 'teammate']
      prefs.forEach(pref => {
        const result = adminRegistrationSchema.safeParse({
          ...validAdminRegistration,
          team_preference: pref,
        })
        expect(result.success).toBe(true)
      })
    })
  })

  describe('schedule_id field validation', () => {
    it('rejects non-UUID schedule_id', () => {
      const result = adminRegistrationSchema.safeParse({
        ...validAdminRegistration,
        schedule_id: 'not-a-uuid',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find(i => i.path.includes('schedule_id'))
        expect(issue?.message).toContain('Schedule ID must be a valid UUID')
      }
    })

    it('rejects missing schedule_id', () => {
      const { schedule_id, ...regWithoutSchedule } = validAdminRegistration
      const result = adminRegistrationSchema.safeParse(regWithoutSchedule)
      expect(result.success).toBe(false)
    })
  })

  describe('registration_mode field validation', () => {
    it('accepts registration_mode: single', () => {
      const result = adminRegistrationSchema.safeParse({
        ...validAdminRegistration,
        registration_mode: 'single',
      })
      expect(result.success).toBe(true)
    })

    it('accepts registration_mode: group', () => {
      const result = adminRegistrationSchema.safeParse({
        schedule_id: '550e8400-e29b-41d4-a716-446655440001',
        registration_mode: 'group',
        players: [validExistingPlayer, validGuestPlayer],
      })
      expect(result.success).toBe(true)
    })

    it('accepts registration_mode: team', () => {
      const result = adminRegistrationSchema.safeParse({
        schedule_id: '550e8400-e29b-41d4-a716-446655440001',
        registration_mode: 'team',
        players: [validExistingPlayer, validGuestPlayer],
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid registration_mode', () => {
      const result = adminRegistrationSchema.safeParse({
        ...validAdminRegistration,
        registration_mode: 'invalid',
      })
      expect(result.success).toBe(false)
    })

    it('rejects missing registration_mode', () => {
      const { registration_mode, ...regWithoutMode } = validAdminRegistration
      const result = adminRegistrationSchema.safeParse(regWithoutMode)
      expect(result.success).toBe(false)
    })
  })

  describe('payment_status field validation', () => {
    it('rejects invalid payment_status', () => {
      const result = adminRegistrationSchema.safeParse({
        ...validAdminRegistration,
        payment_status: 'invalid_status',
      })
      expect(result.success).toBe(false)
    })

    it('accepts all valid payment_status values', () => {
      const statuses = ['pending', 'review', 'paid', 'rejected']
      statuses.forEach(status => {
        const result = adminRegistrationSchema.safeParse({
          ...validAdminRegistration,
          payment_status: status,
        })
        expect(result.success).toBe(true)
      })
    })

    it('defaults to pending when omitted', () => {
      const result = adminRegistrationSchema.safeParse(validAdminRegistration)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.payment_status).toBe('pending')
      }
    })
  })

  describe('team_preference field validation', () => {
    it('rejects invalid team_preference', () => {
      const result = adminRegistrationSchema.safeParse({
        ...validAdminRegistration,
        team_preference: 'invalid_preference',
      })
      expect(result.success).toBe(false)
    })

    it('accepts team_preference: shuffle', () => {
      const result = adminRegistrationSchema.safeParse({
        ...validAdminRegistration,
        team_preference: 'shuffle',
      })
      expect(result.success).toBe(true)
    })

    it('accepts team_preference: teammate', () => {
      const result = adminRegistrationSchema.safeParse({
        ...validAdminRegistration,
        team_preference: 'teammate',
      })
      expect(result.success).toBe(true)
    })

    it('defaults to shuffle when omitted', () => {
      const result = adminRegistrationSchema.safeParse(validAdminRegistration)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.team_preference).toBe('shuffle')
      }
    })
  })

  describe('players field validation', () => {
    it('accepts 1 player (admin allows single player)', () => {
      const result = adminRegistrationSchema.safeParse({
        ...validAdminRegistration,
        players: [validExistingPlayer],
      })
      expect(result.success).toBe(true)
    })

    it('rejects 0 players', () => {
      const result = adminRegistrationSchema.safeParse({
        ...validAdminRegistration,
        players: [],
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find(i => i.path.includes('players'))
        expect(issue?.message).toContain('At least 1 player required')
      }
    })

    it('accepts multiple players', () => {
      const result = adminRegistrationSchema.safeParse({
        ...validAdminRegistration,
        players: [validExistingPlayer, validGuestPlayer, validExistingPlayer],
      })
      expect(result.success).toBe(true)
    })

    it('rejects missing players array', () => {
      const { players, ...regWithoutPlayers } = validAdminRegistration
      const result = adminRegistrationSchema.safeParse(regWithoutPlayers)
      expect(result.success).toBe(false)
    })
  })

  describe('groupPlayerSchema inheritance', () => {
    it('accepts existing player type in players array', () => {
      const result = adminRegistrationSchema.safeParse({
        schedule_id: '550e8400-e29b-41d4-a716-446655440001',
        registration_mode: 'group',
        players: [
          {
            type: 'existing',
            user_id: '550e8400-e29b-41d4-a716-446655440000',
            preferred_position: 'setter',
          },
          validGuestPlayer,
        ],
      })
      expect(result.success).toBe(true)
    })

    it('accepts guest player type in players array', () => {
      const result = adminRegistrationSchema.safeParse({
        schedule_id: '550e8400-e29b-41d4-a716-446655440001',
        registration_mode: 'group',
        players: [
          {
            type: 'guest',
            first_name: 'Jane',
            last_name: 'Doe',
            email: 'jane@example.com',
            preferred_position: 'open_spiker',
            skill_level: 'advanced',
          },
          validExistingPlayer,
        ],
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid player type in players array', () => {
      const result = adminRegistrationSchema.safeParse({
        ...validAdminRegistration,
        players: [
          {
            type: 'unknown',
          },
        ],
      })
      expect(result.success).toBe(false)
    })

    it('rejects guest player with invalid email in players array', () => {
      const result = adminRegistrationSchema.safeParse({
        schedule_id: '550e8400-e29b-41d4-a716-446655440001',
        registration_mode: 'group',
        players: [
          {
            type: 'guest',
            first_name: 'John',
            last_name: 'Doe',
            email: 'not-an-email',
            preferred_position: 'setter',
            skill_level: 'intermediate',
          },
          validExistingPlayer,
        ],
      })
      expect(result.success).toBe(false)
    })

    it('rejects existing player with invalid UUID in players array', () => {
      const result = adminRegistrationSchema.safeParse({
        schedule_id: '550e8400-e29b-41d4-a716-446655440001',
        registration_mode: 'group',
        players: [
          {
            type: 'existing',
            user_id: 'not-a-uuid',
            preferred_position: 'setter',
          },
          validGuestPlayer,
        ],
      })
      expect(result.success).toBe(false)
    })

    it('rejects guest player without skill_level', () => {
      const result = adminRegistrationSchema.safeParse({
        schedule_id: '550e8400-e29b-41d4-a716-446655440001',
        registration_mode: 'single',
        players: [
          {
            type: 'guest',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@example.com',
            preferred_position: 'open_spiker',
          },
        ],
      })
      expect(result.success).toBe(false)
    })

    it('accepts all valid skill levels for guest players', () => {
      const skillLevels = ['developmental', 'developmental_plus', 'intermediate', 'intermediate_plus', 'advanced']
      skillLevels.forEach(skillLevel => {
        const result = adminRegistrationSchema.safeParse({
          schedule_id: '550e8400-e29b-41d4-a716-446655440001',
          registration_mode: 'single',
          players: [
            {
              type: 'guest',
              first_name: 'John',
              last_name: 'Doe',
              email: 'john@example.com',
              preferred_position: 'open_spiker',
              skill_level: skillLevel,
            },
          ],
        })
        expect(result.success).toBe(true)
      })
    })
  })

  describe('combination tests', () => {
    it('accepts all defaults with minimal payload', () => {
      const result = adminRegistrationSchema.safeParse(validAdminRegistration)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.payment_status).toBe('pending')
        expect(result.data.team_preference).toBe('shuffle')
      }
    })

    it('accepts all values explicitly set', () => {
      const result = adminRegistrationSchema.safeParse({
        schedule_id: '550e8400-e29b-41d4-a716-446655440001',
        registration_mode: 'group',
        payment_status: 'paid',
        team_preference: 'teammate',
        players: [validExistingPlayer, validGuestPlayer],
      })
      expect(result.success).toBe(true)
    })
  })
})
