import { z } from 'zod'

export const scheduleSchema = z
  .object({
    start_time: z.string().min(1, 'Start time is required'),
    end_time: z.string().min(1, 'End time is required'),
    location_id: z.string().uuid('Location is required'),
    num_teams: z.number().int().min(2, 'At least 2 teams required'),
    required_levels: z.array(
      z.enum([
        'developmental',
        'developmental_plus',
        'intermediate',
        'intermediate_plus',
        'advanced',
      ])
    ),
    status: z.enum(['open', 'full', 'cancelled', 'completed']),
    position_prices: z.object({
      open_spiker: z.number().min(0, 'Price must be 0 or greater'),
      opposite_spiker: z.number().min(0, 'Price must be 0 or greater'),
      middle_blocker: z.number().min(0, 'Price must be 0 or greater'),
      setter: z.number().min(0, 'Price must be 0 or greater'),
      middle_setter: z.number().min(0, 'Price must be 0 or greater'),
    }),
    team_price: z.number().min(0, 'Team price must be 0 or greater'),
  })
  .refine((data) => new Date(data.end_time) > new Date(data.start_time), {
    message: 'End time must be after start time',
    path: ['end_time'],
  })

export type ScheduleFormData = z.infer<typeof scheduleSchema>

// Team roster validation — used when assigning positions to team members
const playerPositionEnum = z.enum([
  'open_spiker',
  'opposite_spiker',
  'middle_blocker',
  'setter',
  'middle_setter',
])

export const teamRosterSchema = z
  .array(playerPositionEnum)
  .min(6, 'A team requires at least 6 players')
  .refine(
    (positions) => {
      const counts = positions.reduce<Record<string, number>>((acc, p) => {
        acc[p] = (acc[p] ?? 0) + 1
        return acc
      }, {})

      // Combo A: 2 open_spiker, 1 opposite_spiker, 2 middle_blocker, 1 setter
      const isComboA =
        (counts['open_spiker'] ?? 0) === 2 &&
        (counts['opposite_spiker'] ?? 0) === 1 &&
        (counts['middle_blocker'] ?? 0) === 2 &&
        (counts['setter'] ?? 0) === 1 &&
        !counts['middle_setter']

      // Combo B: 2 open_spiker, 2 opposite_spiker, 1 middle_setter, 1 middle_blocker
      const isComboB =
        (counts['open_spiker'] ?? 0) === 2 &&
        (counts['opposite_spiker'] ?? 0) === 2 &&
        (counts['middle_setter'] ?? 0) === 1 &&
        (counts['middle_blocker'] ?? 0) === 1 &&
        !counts['setter']

      return isComboA || isComboB
    },
    {
      message:
        'Invalid lineup. Valid combos: Combo A (2 OS, 1 OPP, 2 MB, 1 S) or Combo B (2 OS, 2 OPP, 1 MS, 1 MB)',
    }
  )

export type TeamRosterData = z.infer<typeof teamRosterSchema>
