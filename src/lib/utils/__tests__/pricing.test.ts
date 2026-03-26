import { describe, it, expect } from 'vitest'
import { computeSoloAmount, computeGroupAmount, computeTeamAmount } from '../pricing'

describe('pricing utilities', () => {
  const mockPricing = {
    position_prices: {
      open_spiker: 290,
      opposite_spiker: 290,
      middle_blocker: 260,
      setter: 260,
      middle_setter: 0,
    },
    team_price: 1600,
  }

  describe('computeSoloAmount', () => {
    it('returns price for a known position', () => {
      const amount = computeSoloAmount(mockPricing, 'open_spiker')
      expect(amount).toBe(290)
    })

    it('returns 0 when position_prices is null', () => {
      const amount = computeSoloAmount({ position_prices: null }, 'open_spiker')
      expect(amount).toBe(0)
    })

    it('returns 0 when position_prices is undefined', () => {
      const amount = computeSoloAmount({ position_prices: undefined }, 'open_spiker')
      expect(amount).toBe(0)
    })

    it('returns 0 when position is null', () => {
      const amount = computeSoloAmount(mockPricing, null)
      expect(amount).toBe(0)
    })

    it('returns 0 for unknown position (key not in prices)', () => {
      const amount = computeSoloAmount(mockPricing, 'unknown_position' as any)
      expect(amount).toBe(0)
    })

    it('returns 0 for position with price of 0', () => {
      const amount = computeSoloAmount(mockPricing, 'middle_setter')
      expect(amount).toBe(0)
    })
  })

  describe('computeGroupAmount', () => {
    it('sums prices for array of positions', () => {
      const amount = computeGroupAmount(mockPricing, ['open_spiker', 'middle_blocker', 'setter'])
      expect(amount).toBe(290 + 260 + 260)
    })

    it('returns 0 when position_prices is null', () => {
      const amount = computeGroupAmount({ position_prices: null }, ['open_spiker', 'middle_blocker'])
      expect(amount).toBe(0)
    })

    it('returns 0 when position_prices is undefined', () => {
      const amount = computeGroupAmount({ position_prices: undefined }, ['open_spiker'])
      expect(amount).toBe(0)
    })

    it('returns 0 for empty positions array', () => {
      const amount = computeGroupAmount(mockPricing, [])
      expect(amount).toBe(0)
    })

    it('handles array with null positions (each contributes 0)', () => {
      const amount = computeGroupAmount(mockPricing, ['open_spiker', null, 'setter'])
      expect(amount).toBe(290 + 0 + 260)
    })

    it('sums multiple instances of same position', () => {
      const amount = computeGroupAmount(mockPricing, ['open_spiker', 'open_spiker', 'open_spiker'])
      expect(amount).toBe(290 * 3)
    })
  })

  describe('computeTeamAmount', () => {
    it('returns team_price when set', () => {
      const amount = computeTeamAmount(mockPricing)
      expect(amount).toBe(1600)
    })

    it('returns 0 when team_price is null', () => {
      const amount = computeTeamAmount({ team_price: null })
      expect(amount).toBe(0)
    })

    it('returns 0 when team_price is undefined', () => {
      const amount = computeTeamAmount({ team_price: undefined })
      expect(amount).toBe(0)
    })

    it('returns team_price of 0', () => {
      const amount = computeTeamAmount({ team_price: 0 })
      expect(amount).toBe(0)
    })

    it('returns large team price values', () => {
      const amount = computeTeamAmount({ team_price: 50000 })
      expect(amount).toBe(50000)
    })
  })
})
