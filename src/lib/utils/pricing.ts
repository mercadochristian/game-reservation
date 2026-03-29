import type { PlayerPosition } from '@/types'

export type SchedulePricing = {
  position_prices?: Record<string, number> | object | null
  team_price?: number | null
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
  return prices[position] ?? 0
}

/**
 * Compute required amount for a group registration (sum of each player's position price)
 */
export function computeGroupAmount(
  schedule: SchedulePricing,
  positions: (PlayerPosition | null)[]
): number {
  if (!schedule.position_prices) return 0
  return positions.reduce((sum, pos) => sum + computeSoloAmount(schedule, pos), 0)
}

/**
 * Compute required amount for a team registration (flat team price)
 */
export function computeTeamAmount(schedule: SchedulePricing): number {
  return schedule.team_price ?? 0
}
