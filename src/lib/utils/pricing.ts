import type { PlayerPosition } from '@/types'

export type SchedulePricing = {
  position_prices?: Record<string, number> | object | null
  team_price?: number | null
  discount_type?: 'percent' | 'fixed' | null
  discount_value?: number | null
}

/**
 * Compute required amount for a solo registration WITHOUT applying discount
 */
export function computeSoloAmountOriginal(
  schedule: SchedulePricing,
  position: PlayerPosition | null
): number {
  if (!schedule.position_prices || !position) return 0
  const prices = schedule.position_prices as Record<string, number>
  return prices[position] ?? 0
}

/**
 * Apply discount to an amount based on schedule discount settings
 */
export function applyDiscount(amount: number, schedule: SchedulePricing): number {
  if (!schedule.discount_type || schedule.discount_value === null || schedule.discount_value === undefined) {
    return amount
  }

  if (schedule.discount_type === 'percent') {
    const discounted = amount * (1 - schedule.discount_value / 100)
    return Math.round(discounted * 100) / 100
  }

  if (schedule.discount_type === 'fixed') {
    return Math.max(0, amount - schedule.discount_value)
  }

  return amount
}

/**
 * Compute required amount for a solo registration based on position price
 */
export function computeSoloAmount(
  schedule: SchedulePricing,
  position: PlayerPosition | null
): number {
  if (!schedule.position_prices || !position) return 0
  const prices = schedule.position_prices as Record<string, number>
  const amount = prices[position] ?? 0
  return applyDiscount(amount, schedule)
}

/**
 * Compute required amount for a group registration (sum of each player's position price)
 */
export function computeGroupAmount(
  schedule: SchedulePricing,
  positions: (PlayerPosition | null)[]
): number {
  if (!schedule.position_prices) return 0
  const subtotal = positions.reduce((sum, pos) => {
    if (!pos) return sum
    const prices = schedule.position_prices as Record<string, number>
    return sum + (prices[pos] ?? 0)
  }, 0)
  return applyDiscount(subtotal, schedule)
}

/**
 * Compute required amount for a team registration (flat team price)
 */
export function computeTeamAmount(schedule: SchedulePricing): number {
  const amount = schedule.team_price ?? 0
  return applyDiscount(amount, schedule)
}
