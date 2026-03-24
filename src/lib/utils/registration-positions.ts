import { GroupPlayer } from '@/lib/validations/group-registration'

interface PositionRequirements {
  setter: number
  middle_blocker: number
  open_spiker: number
  opposite_spiker: number
}

/**
 * Get the required position composition for a complete team
 * @returns Required position counts: 1 setter, 2 middle blockers, 2 open spikers, 1 opposite spiker
 */
export function getRequiredPositions(): PositionRequirements {
  return { setter: 1, middle_blocker: 2, open_spiker: 2, opposite_spiker: 1 }
}

/**
 * Count players by position, treating 'middle_setter' as a setter
 * @param players Array of players to count
 * @returns Object with position counts
 */
export function countPositions(players: GroupPlayer[]): Record<string, number> {
  const counts: Record<string, number> = {
    setter: 0,
    middle_blocker: 0,
    open_spiker: 0,
    opposite_spiker: 0,
  }

  for (const player of players) {
    const pos = player.preferred_position
    if (pos === 'middle_setter') {
      counts['setter']++
    } else if (pos in counts) {
      counts[pos]++
    }
  }

  return counts
}

/**
 * Validate that a team has the minimum required positions
 * @param players Array of players to validate
 * @param required Required position counts
 * @returns Validation result with any missing positions
 */
export function validateTeamPositions(
  players: GroupPlayer[],
  required: PositionRequirements
): { valid: boolean; missing?: Array<{ position: string; required: number; provided: number }> } {
  const counts = countPositions(players)
  const missing: Array<{ position: string; required: number; provided: number }> = []

  for (const [pos, req] of Object.entries(required)) {
    const provided = counts[pos] || 0
    if (provided < req) {
      missing.push({ position: pos, required: req, provided })
    }
  }

  return { valid: missing.length === 0, missing: missing.length > 0 ? missing : undefined }
}

/**
 * Validate that a group does not exceed maximum players per position
 * Group max: 1 setter, 1 opposite spiker, 2 middle blockers, 2 open spikers
 * @param players Array of players to validate
 * @returns Validation result with any position overages
 */
export function validateGroupPositions(
  players: GroupPlayer[]
): { valid: boolean; issues?: Array<{ position: string; max: number; provided: number }> } {
  const counts = countPositions(players)
  const maxPerPosition: Record<string, number> = {
    setter: 1,
    opposite_spiker: 1,
    middle_blocker: 2,
    open_spiker: 2,
  }
  const issues: Array<{ position: string; max: number; provided: number }> = []

  for (const [pos, max] of Object.entries(maxPerPosition)) {
    const count = counts[pos] || 0
    if (count > max) {
      issues.push({ position: pos, max, provided: count })
    }
  }

  return { valid: issues.length === 0, issues: issues.length > 0 ? issues : undefined }
}
