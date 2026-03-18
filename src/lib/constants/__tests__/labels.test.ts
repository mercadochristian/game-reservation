import { describe, it, expect } from 'vitest'
import {
  SKILL_LEVEL_LABELS,
  POSITION_LABELS,
  STATUS_LABELS,
} from '../labels'

describe('label constants', () => {
  describe('SKILL_LEVEL_LABELS', () => {
    it('has exactly 5 entries', () => {
      expect(Object.keys(SKILL_LEVEL_LABELS)).toHaveLength(5)
    })

    it('covers all expected skill levels', () => {
      const keys = Object.keys(SKILL_LEVEL_LABELS)
      expect(keys).toContain('developmental')
      expect(keys).toContain('developmental_plus')
      expect(keys).toContain('intermediate')
      expect(keys).toContain('intermediate_plus')
      expect(keys).toContain('advanced')
    })

    it('maps each key to a non-empty display string', () => {
      Object.entries(SKILL_LEVEL_LABELS).forEach(([key, label]) => {
        expect(typeof label).toBe('string')
        expect(label.length).toBeGreaterThan(0)
      })
    })

    it('does not have undefined or empty string values', () => {
      Object.values(SKILL_LEVEL_LABELS).forEach((label) => {
        expect(label).toBeDefined()
        expect(label).not.toBe('')
      })
    })

    it('has humanized display text for each level', () => {
      // Verify each level has a meaningful display string (not just the key)
      Object.entries(SKILL_LEVEL_LABELS).forEach(([key, label]) => {
        expect(label.length).toBeGreaterThan(key.length / 2) // Label is substantive
        expect(label).not.toBe(key) // Not just the key itself
      })
    })
  })

  describe('POSITION_LABELS', () => {
    it('has exactly 5 entries', () => {
      expect(Object.keys(POSITION_LABELS)).toHaveLength(5)
    })

    it('covers all expected positions', () => {
      const keys = Object.keys(POSITION_LABELS)
      expect(keys).toContain('open_spiker')
      expect(keys).toContain('opposite_spiker')
      expect(keys).toContain('middle_blocker')
      expect(keys).toContain('setter')
      expect(keys).toContain('middle_setter')
    })

    it('maps each key to a non-empty display string', () => {
      Object.entries(POSITION_LABELS).forEach(([key, label]) => {
        expect(typeof label).toBe('string')
        expect(label.length).toBeGreaterThan(0)
      })
    })

    it('does not have undefined or empty string values', () => {
      Object.values(POSITION_LABELS).forEach((label) => {
        expect(label).toBeDefined()
        expect(label).not.toBe('')
      })
    })

    it('has humanized display text for each position', () => {
      // Verify each position has a meaningful display string
      Object.entries(POSITION_LABELS).forEach(([key, label]) => {
        expect(label.length).toBeGreaterThan(key.length / 2)
        expect(label).not.toBe(key)
        expect(label).toMatch(/[A-Z]/) // Has at least one capital letter
      })
    })
  })

  describe('STATUS_LABELS', () => {
    it('has exactly 4 entries', () => {
      expect(Object.keys(STATUS_LABELS)).toHaveLength(4)
    })

    it('covers all expected statuses', () => {
      const keys = Object.keys(STATUS_LABELS)
      expect(keys).toContain('open')
      expect(keys).toContain('full')
      expect(keys).toContain('cancelled')
      expect(keys).toContain('completed')
    })

    it('maps each key to a non-empty display string', () => {
      Object.entries(STATUS_LABELS).forEach(([key, label]) => {
        expect(typeof label).toBe('string')
        expect(label.length).toBeGreaterThan(0)
      })
    })

    it('does not have undefined or empty string values', () => {
      Object.values(STATUS_LABELS).forEach((label) => {
        expect(label).toBeDefined()
        expect(label).not.toBe('')
      })
    })

    it('has humanized display text for each status', () => {
      // Verify each status has a meaningful display string
      Object.entries(STATUS_LABELS).forEach(([key, label]) => {
        expect(label.length).toBeGreaterThan(0)
        expect(label).toMatch(/[A-Z]/) // Capitalized
      })
    })
  })
})
