import { z } from 'zod'

export const saveLineupSchema = z.object({
  schedule_id: z.string().uuid(),
  teams: z.array(
    z.object({
      name: z.string().min(1).max(60),
    })
  ).min(1),
  assignments: z.array(
    z.object({
      registration_id: z.string().uuid(),
      team_index: z.number().int().nullable(),
    })
  ),
})

export type SaveLineupRequest = z.infer<typeof saveLineupSchema>
