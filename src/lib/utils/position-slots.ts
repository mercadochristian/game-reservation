export const POSITION_SLOTS = [
  { key: 'open_spiker',       label: 'Open Spiker',       multiplier: 2 },
  { key: 'opposite_spiker',   label: 'Opposite Spiker',   multiplier: 1 },
  { key: 'middle_blocker',    label: 'Middle Blocker',    multiplier: 2 },
  { key: 'setter',            label: 'Setter',            multiplier: 1 },
] as const

export type PositionKey = (typeof POSITION_SLOTS)[number]['key']

/** Total slots for a position given number of teams */
export function getPositionTotal(positionKey: string, numTeams: number): number {
  const slot = POSITION_SLOTS.find((p) => p.key === positionKey)
  return (slot?.multiplier ?? 0) * numTeams
}

/** Available (unfilled) slots for a position */
export function getPositionAvailable(positionKey: string, numTeams: number, registered: number): number {
  return Math.max(0, getPositionTotal(positionKey, numTeams) - registered)
}

/** Full breakdown for all positions given a schedule and its position counts */
export function getPositionBreakdown(
  numTeams: number,
  positionCounts: Record<string, number>
) {
  return POSITION_SLOTS.map((pos) => {
    const total      = getPositionTotal(pos.key, numTeams)
    const registered = positionCounts[pos.key] ?? 0
    const available  = getPositionAvailable(pos.key, numTeams, registered)
    return { key: pos.key, label: pos.label, total, registered, available, isFull: available <= 0 }
  })
}
