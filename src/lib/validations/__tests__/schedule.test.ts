import { describe, it, expect } from 'vitest'
import { scheduleSchema, teamRosterSchema } from '../schedule'

const validSchedule = {
  start_time: '2026-03-20T19:00:00Z',
  end_time: '2026-03-20T21:00:00Z',
  location_id: '550e8400-e29b-41d4-a716-446655440000',
  num_teams: 2,
  required_levels: ['intermediate', 'advanced'],
  status: 'open',
  position_prices: {
    open_spiker: 290,
    opposite_spiker: 290,
    middle_blocker: 260,
    setter: 260,
  },
  team_price: 1600,
}

describe('scheduleSchema', () => {
  describe('valid inputs', () => {
    it('accepts valid complete schedule', () => {
      const result = scheduleSchema.safeParse(validSchedule)
      expect(result.success).toBe(true)
    })

    it('accepts with minimal required_levels array', () => {
      const result = scheduleSchema.safeParse({
        ...validSchedule,
        required_levels: [],
      })
      expect(result.success).toBe(true)
    })

    it('accepts with all 5 skill levels', () => {
      const result = scheduleSchema.safeParse({
        ...validSchedule,
        required_levels: ['developmental', 'developmental_plus', 'intermediate', 'intermediate_plus', 'advanced'],
      })
      expect(result.success).toBe(true)
    })

    it('accepts status: open', () => {
      const result = scheduleSchema.safeParse(validSchedule)
      expect(result.success).toBe(true)
    })

    it('accepts status: full', () => {
      const result = scheduleSchema.safeParse({
        ...validSchedule,
        status: 'full',
      })
      expect(result.success).toBe(true)
    })

    it('accepts status: cancelled', () => {
      const result = scheduleSchema.safeParse({
        ...validSchedule,
        status: 'cancelled',
      })
      expect(result.success).toBe(true)
    })

    it('accepts status: completed', () => {
      const result = scheduleSchema.safeParse({
        ...validSchedule,
        status: 'completed',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('pricing field validation', () => {
    it('rejects missing position_prices', () => {
      const result = scheduleSchema.safeParse({
        ...validSchedule,
        position_prices: undefined,
      })
      expect(result.success).toBe(false)
    })

    it('rejects missing team_price', () => {
      const result = scheduleSchema.safeParse({
        ...validSchedule,
        team_price: undefined,
      })
      expect(result.success).toBe(false)
    })

    it('accepts position prices of 0', () => {
      const result = scheduleSchema.safeParse({
        ...validSchedule,
        position_prices: {
          open_spiker: 0,
          opposite_spiker: 0,
          middle_blocker: 0,
          setter: 0,
        },
      })
      expect(result.success).toBe(true)
    })

    it('accepts team price of 0', () => {
      const result = scheduleSchema.safeParse({
        ...validSchedule,
        team_price: 0,
      })
      expect(result.success).toBe(true)
    })

    it('rejects negative position prices', () => {
      const result = scheduleSchema.safeParse({
        ...validSchedule,
        position_prices: {
          ...validSchedule.position_prices,
          open_spiker: -100,
        },
      })
      expect(result.success).toBe(false)
    })

    it('rejects negative team price', () => {
      const result = scheduleSchema.safeParse({
        ...validSchedule,
        team_price: -100,
      })
      expect(result.success).toBe(false)
    })

    it('accepts decimal position prices', () => {
      const result = scheduleSchema.safeParse({
        ...validSchedule,
        position_prices: {
          open_spiker: 290.50,
          opposite_spiker: 290.75,
          middle_blocker: 260.25,
          setter: 260.99,
        },
      })
      expect(result.success).toBe(true)
    })

    it('accepts large prices', () => {
      const result = scheduleSchema.safeParse({
        ...validSchedule,
        position_prices: {
          open_spiker: 10000,
          opposite_spiker: 9999,
          middle_blocker: 8888,
          setter: 7777,
        },
        team_price: 50000,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('start_time and end_time field validation', () => {
    it('rejects empty start_time', () => {
      const result = scheduleSchema.safeParse({
        ...validSchedule,
        start_time: '',
      })
      expect(result.success).toBe(false)
    })

    it('rejects empty end_time', () => {
      const result = scheduleSchema.safeParse({
        ...validSchedule,
        end_time: '',
      })
      expect(result.success).toBe(false)
    })

    it('accepts when end_time is after start_time', () => {
      const result = scheduleSchema.safeParse(validSchedule)
      expect(result.success).toBe(true)
    })

    it('rejects when end_time equals start_time (cross-field refinement)', () => {
      const result = scheduleSchema.safeParse({
        ...validSchedule,
        start_time: '2026-03-20T19:00:00Z',
        end_time: '2026-03-20T19:00:00Z',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find(i => i.path.includes('end_time'))
        expect(issue?.message).toContain('End time must be after start time')
      }
    })

    it('rejects when end_time is before start_time', () => {
      const result = scheduleSchema.safeParse({
        ...validSchedule,
        start_time: '2026-03-20T21:00:00Z',
        end_time: '2026-03-20T19:00:00Z',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find(i => i.path.includes('end_time'))
        expect(issue?.message).toContain('End time must be after start time')
      }
    })
  })

  describe('location_id field validation', () => {
    it('rejects invalid UUID format', () => {
      const result = scheduleSchema.safeParse({
        ...validSchedule,
        location_id: 'not-a-uuid',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find(i => i.path.includes('location_id'))
        expect(issue?.message).toContain('Location is required')
      }
    })

    it('accepts valid UUID', () => {
      const result = scheduleSchema.safeParse(validSchedule)
      expect(result.success).toBe(true)
    })
  })

  describe('num_teams field validation', () => {
    it('rejects num_teams < 2', () => {
      const result = scheduleSchema.safeParse({
        ...validSchedule,
        num_teams: 1,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find(i => i.path.includes('num_teams'))
        expect(issue?.message).toContain('At least 2 teams required')
      }
    })

    it('rejects num_teams: 0', () => {
      const result = scheduleSchema.safeParse({
        ...validSchedule,
        num_teams: 0,
      })
      expect(result.success).toBe(false)
    })

    it('accepts num_teams: 2 (minimum)', () => {
      const result = scheduleSchema.safeParse({
        ...validSchedule,
        num_teams: 2,
      })
      expect(result.success).toBe(true)
    })

    it('accepts num_teams: 10', () => {
      const result = scheduleSchema.safeParse({
        ...validSchedule,
        num_teams: 10,
      })
      expect(result.success).toBe(true)
    })

    it('rejects non-integer num_teams', () => {
      const result = scheduleSchema.safeParse({
        ...validSchedule,
        num_teams: 2.5,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('required_levels field validation', () => {
    it('rejects invalid skill level in array', () => {
      const result = scheduleSchema.safeParse({
        ...validSchedule,
        required_levels: ['intermediate', 'unknown_level'],
      })
      expect(result.success).toBe(false)
    })

    it('accepts empty required_levels array', () => {
      const result = scheduleSchema.safeParse({
        ...validSchedule,
        required_levels: [],
      })
      expect(result.success).toBe(true)
    })

    it('accepts all valid skill levels', () => {
      const result = scheduleSchema.safeParse({
        ...validSchedule,
        required_levels: ['developmental', 'developmental_plus', 'intermediate', 'intermediate_plus', 'advanced'],
      })
      expect(result.success).toBe(true)
    })
  })

  describe('status field validation', () => {
    it('rejects invalid status', () => {
      const result = scheduleSchema.safeParse({
        ...validSchedule,
        status: 'unknown',
      })
      expect(result.success).toBe(false)
    })

    it('rejects missing status', () => {
      const { status, ...scheduleWithoutStatus } = validSchedule
      const result = scheduleSchema.safeParse(scheduleWithoutStatus)
      expect(result.success).toBe(false)
    })
  })
})

describe('teamRosterSchema', () => {
  describe('valid inputs', () => {
    it('accepts valid lineup: 2 open_spiker, 1 opposite_spiker, 2 middle_blocker, 1 setter', () => {
      const result = teamRosterSchema.safeParse([
        'open_spiker',
        'open_spiker',
        'opposite_spiker',
        'middle_blocker',
        'middle_blocker',
        'setter',
      ])
      expect(result.success).toBe(true)
    })

    it('accepts valid lineup in different order', () => {
      const result = teamRosterSchema.safeParse([
        'setter',
        'open_spiker',
        'middle_blocker',
        'open_spiker',
        'opposite_spiker',
        'middle_blocker',
      ])
      expect(result.success).toBe(true)
    })
  })

  describe('minimum length validation', () => {
    it('rejects array with 5 players (less than 6)', () => {
      const result = teamRosterSchema.safeParse([
        'open_spiker',
        'open_spiker',
        'opposite_spiker',
        'middle_blocker',
        'setter',
      ])
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find(i => i.message.includes('at least 6'))
        expect(issue).toBeDefined()
      }
    })

    it('rejects empty array', () => {
      const result = teamRosterSchema.safeParse([])
      expect(result.success).toBe(false)
    })
  })

  describe('position lineup combination validation', () => {
    it('rejects array with wrong position counts', () => {
      const result = teamRosterSchema.safeParse([
        'open_spiker',
        'open_spiker',
        'opposite_spiker',
        'middle_blocker',
        'middle_blocker',
        'middle_blocker',
      ])
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find(i => i.message.includes('Invalid lineup'))
        expect(issue).toBeDefined()
      }
    })

    it('rejects invalid lineup with wrong position counts', () => {
      const result = teamRosterSchema.safeParse([
        'open_spiker',
        'open_spiker',
        'opposite_spiker',
        'opposite_spiker',
        'middle_blocker',
        'setter',
      ])
      expect(result.success).toBe(false)
    })

    it('rejects array with 3 setters', () => {
      const result = teamRosterSchema.safeParse([
        'setter',
        'setter',
        'setter',
        'open_spiker',
        'open_spiker',
        'opposite_spiker',
      ])
      expect(result.success).toBe(false)
    })

    it('rejects all same position', () => {
      const result = teamRosterSchema.safeParse([
        'open_spiker',
        'open_spiker',
        'open_spiker',
        'open_spiker',
        'open_spiker',
        'open_spiker',
      ])
      expect(result.success).toBe(false)
    })
  })

  describe('position enum validation', () => {
    it('rejects invalid position string', () => {
      const result = teamRosterSchema.safeParse([
        'open_spiker',
        'open_spiker',
        'opposite_spiker',
        'middle_blocker',
        'middle_blocker',
        'invalid_position',
      ])
      expect(result.success).toBe(false)
    })

    it('rejects invalid lineup when all 4 positions are present but with wrong counts', () => {
      const result = teamRosterSchema.safeParse([
        'open_spiker',
        'opposite_spiker',
        'middle_blocker',
        'setter',
        'open_spiker',
        'open_spiker',
      ])
      expect(result.success).toBe(false)
    })
  })
})
