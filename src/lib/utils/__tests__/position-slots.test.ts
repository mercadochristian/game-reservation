import { describe, it, expect } from 'vitest'
import {
  POSITION_SLOTS,
  PositionKey,
  getPositionTotal,
  getPositionAvailable,
  getPositionBreakdown,
} from '../position-slots'

describe('position-slots utilities', () => {
  describe('POSITION_SLOTS constant', () => {
    it('has exactly 4 entries', () => {
      expect(POSITION_SLOTS).toHaveLength(4)
    })

    it('has correct keys and multipliers', () => {
      const keys = POSITION_SLOTS.map((p) => p.key)
      expect(keys).toEqual(['open_spiker', 'opposite_spiker', 'middle_blocker', 'setter'])
    })

    it('has correct multipliers', () => {
      const multipliers = Object.fromEntries(POSITION_SLOTS.map((p) => [p.key, p.multiplier]))
      expect(multipliers.open_spiker).toBe(2)
      expect(multipliers.opposite_spiker).toBe(1)
      expect(multipliers.middle_blocker).toBe(2)
      expect(multipliers.setter).toBe(1)
    })

    it('each entry has label, key, and multiplier', () => {
      POSITION_SLOTS.forEach((slot) => {
        expect(slot).toHaveProperty('key')
        expect(slot).toHaveProperty('label')
        expect(slot).toHaveProperty('multiplier')
        expect(typeof slot.label).toBe('string')
        expect(slot.label.length).toBeGreaterThan(0)
      })
    })
  })

  describe('getPositionTotal', () => {
    it('returns multiplier × numTeams for known position', () => {
      expect(getPositionTotal('open_spiker', 1)).toBe(2) // multiplier 2
      expect(getPositionTotal('open_spiker', 2)).toBe(4)
      expect(getPositionTotal('open_spiker', 3)).toBe(6)
      expect(getPositionTotal('setter', 1)).toBe(1) // multiplier 1
      expect(getPositionTotal('setter', 3)).toBe(3)
    })

    it('returns 0 for unknown position key', () => {
      expect(getPositionTotal('unknown_position', 2)).toBe(0)
      expect(getPositionTotal('invalid', 5)).toBe(0)
    })

    it('returns 0 when numTeams is 0', () => {
      expect(getPositionTotal('open_spiker', 0)).toBe(0)
      expect(getPositionTotal('setter', 0)).toBe(0)
    })

    it('handles all 4 position keys', () => {
      const numTeams = 2
      expect(getPositionTotal('open_spiker', numTeams)).toBe(4)
      expect(getPositionTotal('opposite_spiker', numTeams)).toBe(2)
      expect(getPositionTotal('middle_blocker', numTeams)).toBe(4)
      expect(getPositionTotal('setter', numTeams)).toBe(2)
    })
  })

  describe('getPositionAvailable', () => {
    it('returns correct available slots when registered < total', () => {
      // open_spiker with 2 teams = 4 total slots
      expect(getPositionAvailable('open_spiker', 2, 1)).toBe(3)
      expect(getPositionAvailable('open_spiker', 2, 2)).toBe(2)
      expect(getPositionAvailable('open_spiker', 2, 3)).toBe(1)
    })

    it('returns 0 when registered equals total (full)', () => {
      expect(getPositionAvailable('open_spiker', 2, 4)).toBe(0)
      expect(getPositionAvailable('setter', 2, 2)).toBe(0)
    })

    it('clamps to 0 when registered > total (prevents negative)', () => {
      expect(getPositionAvailable('open_spiker', 2, 5)).toBe(0)
      expect(getPositionAvailable('open_spiker', 2, 100)).toBe(0)
    })

    it('returns 0 for unknown position', () => {
      expect(getPositionAvailable('unknown', 2, 1)).toBe(0)
    })

    it('returns total when registered is 0', () => {
      expect(getPositionAvailable('open_spiker', 2, 0)).toBe(4)
      expect(getPositionAvailable('setter', 3, 0)).toBe(3)
    })
  })

  describe('getPositionBreakdown', () => {
    it('returns array with 4 entries for 4 positions', () => {
      const result = getPositionBreakdown(1, {})
      expect(result).toHaveLength(4)
    })

    it('returns entries in POSITION_SLOTS order', () => {
      const result = getPositionBreakdown(1, {})
      const keys = result.map((r) => r.key)
      expect(keys).toEqual(['open_spiker', 'opposite_spiker', 'middle_blocker', 'setter'])
    })

    it('includes key, label, total, registered, available, isFull', () => {
      const result = getPositionBreakdown(1, {})
      result.forEach((entry) => {
        expect(entry).toHaveProperty('key')
        expect(entry).toHaveProperty('label')
        expect(entry).toHaveProperty('total')
        expect(entry).toHaveProperty('registered')
        expect(entry).toHaveProperty('available')
        expect(entry).toHaveProperty('isFull')
      })
    })

    it('computes correct total for each position with numTeams', () => {
      const result = getPositionBreakdown(2, {})
      expect(result[0].total).toBe(4) // open_spiker: 2 * 2
      expect(result[1].total).toBe(2) // opposite_spiker: 1 * 2
      expect(result[2].total).toBe(4) // middle_blocker: 2 * 2
      expect(result[3].total).toBe(2) // setter: 1 * 2
    })

    it('sets isFull when available <= 0', () => {
      const result = getPositionBreakdown(2, {
        open_spiker: 4, // full
        setter: 1, // not full (total 2)
      })
      expect(result[0].isFull).toBe(true) // open_spiker
      expect(result[3].isFull).toBe(false) // setter
    })

    it('uses positionCounts for registered values', () => {
      const result = getPositionBreakdown(2, {
        open_spiker: 2,
        setter: 1,
      })
      expect(result[0].registered).toBe(2)
      expect(result[0].available).toBe(2) // 4 - 2
      expect(result[3].registered).toBe(1)
      expect(result[3].available).toBe(1) // 2 - 1
    })

    it('defaults registered to 0 for missing positionCounts keys', () => {
      const result = getPositionBreakdown(2, {})
      result.forEach((entry) => {
        expect(entry.registered).toBe(0)
      })
    })

    it('handles empty positionCounts', () => {
      const result = getPositionBreakdown(2, {})
      expect(result[0].available).toBe(4) // total 4, registered 0
      expect(result[0].isFull).toBe(false)
    })

    it('handles all positions full', () => {
      const result = getPositionBreakdown(2, {
        open_spiker: 4,
        opposite_spiker: 2,
        middle_blocker: 4,
        setter: 2,
      })
      result.forEach((entry) => {
        expect(entry.isFull).toBe(true)
        expect(entry.available).toBe(0)
      })
    })

    it('handles partial fill across positions', () => {
      const result = getPositionBreakdown(3, {
        open_spiker: 3,
        setter: 1,
        middle_blocker: 6,
      })
      expect(result[0].available).toBe(3) // 6 - 3
      expect(result[0].isFull).toBe(false)
      expect(result[2].available).toBe(0) // 6 - 6
      expect(result[2].isFull).toBe(true)
    })

    it('handles unknown position key in positionCounts', () => {
      const result = getPositionBreakdown(2, {
        open_spiker: 2,
        unknown_position: 10, // ignored
      })
      // Should not throw; unknown key is silently ignored
      expect(result).toHaveLength(4)
      expect(result[0].registered).toBe(2)
    })
  })
})
