const TEAM_REQUIRED_POSITIONS = {
  setter: 1,
  middle_blocker: 2,
  open_spiker: 2,
  opposite_spiker: 1,
}

export function isPositionFull(
  position: string,
  numTeams: number,
  currentCount: number
): boolean {
  const capacity =
    numTeams * (TEAM_REQUIRED_POSITIONS[position as keyof typeof TEAM_REQUIRED_POSITIONS] || 0)
  return currentCount >= capacity
}

export function canCreateFullTeam(
  numTeams: number,
  positionCounts: Record<string, number>
): boolean {
  const positions = ['open_spiker', 'opposite_spiker', 'middle_blocker', 'setter'] as const
  for (const pos of positions) {
    const capacity = numTeams * (TEAM_REQUIRED_POSITIONS[pos] || 0)
    const currentCount = positionCounts[pos] ?? 0
    const available = capacity - currentCount
    const required = TEAM_REQUIRED_POSITIONS[pos]
    if (available < required) {
      return false
    }
  }
  return true
}

export function getPositionCapacity(
  position: string,
  numTeams: number
): number {
  return numTeams * (TEAM_REQUIRED_POSITIONS[position as keyof typeof TEAM_REQUIRED_POSITIONS] || 0)
}
