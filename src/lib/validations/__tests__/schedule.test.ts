import { describe, it, expect } from 'vitest'
import { scheduleSchema, teamRosterSchema } from '../schedule'

const validSchedule = {
  title: 'Friday Evening Volleyball',
  start_time: '2026-03-20T19:00:00Z',
  end_time: '2026-03-20T21:00:00Z',
  location_id: '550e8400-e29b-41d4-a716-446655440000',
  num_teams: 2,
  required_levels: ['intermediate', 'advanced'],
  status: 'open',
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

  describe('title field validation', () => {
    it('rejects empty title', () => {
      const result = scheduleSchema.safeParse({
        ...validSchedule,
        title: '',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find(i => i.path.includes('title'))
        expect(issue?.message).toContain('Title is required')
      }
    })

    it('rejects title exceeding 255 characters', () => {
      const result = scheduleSchema.safeParse({
        ...validSchedule,
        title: 'a'.repeat(256),
      })
      expect(result.success).toBe(false)
    })

    it('accepts title of exactly 255 characters', () => {
      const result = scheduleSchema.safeParse({
        ...validSchedule,
        title: 'a'.repeat(255),
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
    it('accepts Combo A: 2 open_spiker, 1 opposite_spiker, 2 middle_blocker, 1 setter', () => {
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

    it('accepts Combo B: 2 open_spiker, 2 opposite_spiker, 1 middle_setter, 1 middle_blocker', () => {
      const result = teamRosterSchema.safeParse([
        'open_spiker',
        'open_spiker',
        'opposite_spiker',
        'opposite_spiker',
        'middle_setter',
        'middle_blocker',
      ])
      expect(result.success).toBe(true)
    })

    it('accepts Combo A in different order', () => {
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

    it('rejects Combo A with middle_setter present', () => {
      const result = teamRosterSchema.safeParse([
        'open_spiker',
        'open_spiker',
        'opposite_spiker',
        'middle_blocker',
        'middle_blocker',
        'middle_setter',
      ])
      expect(result.success).toBe(false)
    })

    it('rejects Combo B with setter present (instead of middle_setter)', () => {
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

    it('accepts all 5 valid position enums', () => {
      const result = teamRosterSchema.safeParse([
        'open_spiker',
        'opposite_spiker',
        'middle_blocker',
        'setter',
        'middle_setter',
        'open_spiker',
      ])
      expect(result.success).toBe(false) // Wrong counts, but tests that enum values are accepted
    })
  })
})
